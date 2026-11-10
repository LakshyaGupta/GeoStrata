import { Link } from "@tanstack/react-router";
import { Download, FileUp, Loader2, PanelLeft, PanelRight, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { downloadBlob, slug, toCsv, toJson, toUsda } from "@/lib/geo/export";
import { generateDataset, RESOLUTIONS, SCENARIOS, type ScenarioId } from "@/lib/geo/generate";
import { useExplorer, viewerHandles } from "@/lib/geo/store";
import { parseCsvDataset, validateDataset } from "@/lib/geo/validate";
import { Logo } from "@/components/site/Logo";

export function TopBar({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  const scenario = useExplorer((s) => s.scenario);
  const resolution = useExplorer((s) => s.resolution);
  const uploaded = useExplorer((s) => s.uploaded);
  const ds = useExplorer((s) => s.dataset);
  const { loadScenario, setResolution, loadUpload } = useExplorer.getState();

  return (
    <header className="flex h-12 items-center gap-2 border-b border-border bg-panel px-2 sm:px-3">
      <Button size="icon" variant="ghost" className="size-8 lg:hidden" onClick={onLeft} aria-label="Open layers and view controls"><PanelLeft className="size-4" /></Button>
      <Link to="/" className="flex items-center gap-2 pr-2" aria-label="GeoStrata home">
        <Logo className="size-5 text-primary" />
        <span className="hidden text-sm font-semibold tracking-tight sm:inline">GeoStrata</span>
      </Link>
      <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
      <Select
        value={scenario}
        onValueChange={(v) => (v === "upload" ? uploaded && loadUpload(uploaded) : loadScenario(v as ScenarioId))}
      >
        <SelectTrigger className="h-8 w-[150px] text-xs sm:w-[190px]" aria-label="Dataset"><SelectValue /></SelectTrigger>
        <SelectContent>
          {SCENARIOS.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          {uploaded && <SelectItem value="upload">Upload: {uploaded.name}</SelectItem>}
        </SelectContent>
      </Select>
      <Select value={String(resolution)} onValueChange={(v) => setResolution(Number(v))} disabled={scenario === "upload"}>
        <SelectTrigger className="num hidden h-8 w-[92px] text-xs md:flex" aria-label="Grid resolution"><SelectValue /></SelectTrigger>
        <SelectContent>{RESOLUTIONS.map((r) => <SelectItem key={r} value={String(r)} className="num">{r} × {Math.round(r * 0.8)}</SelectItem>)}</SelectContent>
      </Select>
      <span className="eyebrow ml-1 hidden rounded border border-warning/40 px-1.5 py-0.5 text-warning xl:inline">
        {ds.source === "synthetic" ? "Synthetic data" : "Local upload"}
      </span>
      <div className="ml-auto flex items-center gap-1.5">
        {scenario === "upload" && (
          <Button size="sm" variant="ghost" className="hidden h-8 text-xs sm:flex" onClick={() => loadScenario("layered-basin")}><RotateCcw className="size-3.5" /> Reset to demo data</Button>
        )}
        <UploadDialog />
        <ExportMenu />
        <Button size="icon" variant="ghost" className="size-8 xl:hidden" onClick={onRight} aria-label="Open inspector"><PanelRight className="size-4" /></Button>
      </div>
    </header>
  );
}

function UploadDialog() {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { loadUpload, log, loadScenario } = useExplorer.getState();
  const scenario = useExplorer((s) => s.scenario);

  async function handle(file: File) {
    setBusy(true);
    setErrors(null);
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("File is larger than 20 MB.");
      const text = await file.text();
      const ext = file.name.toLowerCase().split(".").pop();
      let r;
      if (ext === "csv") r = parseCsvDataset(text, file.name.replace(/\.csv$/i, ""));
      else if (ext === "json") {
        let parsed: unknown;
        try { parsed = JSON.parse(text); } catch { throw new Error("File is not valid JSON."); }
        r = validateDataset(parsed);
      } else throw new Error("Unsupported file type. Use .json or .csv.");
      if (!r.ok) {
        setErrors(r.errors);
        log("error", `Rejected ${file.name}: ${r.errors[0]}`);
        return;
      }
      loadUpload(r.dataset);
      toast.success(`Loaded ${r.dataset.name}`);
      setOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrors([msg]);
      log("error", `Rejected ${file.name}: ${msg}`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const example = () => generateDataset("folded-formations", 16);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setErrors(null); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs"><FileUp className="size-3.5" /><span className="hidden sm:inline">Upload</span></Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload a dataset</DialogTitle>
          <DialogDescription>JSON or CSV grid of surfaces. Files are parsed and validated in this browser and never leave your device.</DialogDescription>
        </DialogHeader>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-viewport px-4 py-8 text-center hover:border-primary">
          {busy ? <Loader2 className="size-5 animate-spin text-primary" /> : <FileUp className="size-5 text-primary" />}
          <span className="text-sm">{busy ? "Validating…" : "Choose a .json or .csv file"}</span>
          <input ref={input} type="file" accept=".json,.csv,application/json,text/csv" className="sr-only" onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])} aria-label="Dataset file" />
        </label>
        {errors && (
          <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <div className="font-medium text-destructive">Dataset rejected</div>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[13px] text-foreground">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}
        <div className="space-y-2 text-[13px] text-muted-foreground">
          <p><span className="text-foreground">CSV:</span> header <code className="num text-foreground">x,y,surface_1,…,surface_n</code>, surfaces top → bottom, one row per node on a regular grid.</p>
          <p><span className="text-foreground">JSON:</span> <code className="num text-foreground">{"{ name, grid, formations[], surfaces[], wells? }"}</code> with formations.length + 1 surfaces. See Docs for the full schema.</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => downloadBlob(toJson(example()), "geostrata-example.json", "application/json")}>Example JSON</Button>
            <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => downloadBlob(toCsv(example()), "geostrata-example.csv", "text/csv")}>Example CSV</Button>
            {scenario === "upload" && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { loadScenario("layered-basin"); setOpen(false); }}>Reset to demo data</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExportMenu() {
  const ds = useExplorer((s) => s.dataset);
  const layers = useExplorer((s) => s.layers);
  const log = useExplorer((s) => s.log);
  const [busy, setBusy] = useState(false);
  const base = `geostrata-${slug(ds.name)}`;

  const run = async (label: string, fn: () => Promise<void> | void) => {
    setBusy(true);
    try {
      await fn();
      log("success", `Exported ${label}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log("error", `Export ${label} failed: ${msg}`);
      toast.error(`Export failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-8 text-xs" disabled={busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}<span className="hidden sm:inline">Export</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="eyebrow">Data</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => run("JSON", () => downloadBlob(toJson(ds), `${base}.json`, "application/json"))}>Dataset · JSON</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("CSV", () => downloadBlob(toCsv(ds), `${base}.csv`, "text/csv"))}>Surface samples · CSV</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="eyebrow">Geometry</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => run("GLB", async () => {
          if (!viewerHandles.exportGlb) throw new Error("3D viewer not ready");
          downloadBlob(await viewerHandles.exportGlb(), `${base}.glb`, "model/gltf-binary");
        })}>Visible scene · GLB</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("USDA", () => {
          const vis = new Set(ds.formations.filter((f) => layers[f.id]?.visible).map((f) => f.id));
          downloadBlob(toUsda(ds, vis), `${base}.usda`, "text/plain");
        })}>Visible formations · OpenUSD (.usda)</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => run("PNG screenshot", async () => {
          const url = viewerHandles.screenshot?.();
          if (!url) throw new Error("3D viewer not ready");
          const blob = await (await fetch(url)).blob();
          downloadBlob(blob, `${base}.png`, "image/png");
        })}>Screenshot · PNG</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
