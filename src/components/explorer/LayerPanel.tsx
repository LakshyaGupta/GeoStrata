import { Eye, EyeOff, RotateCcw, Box, Grid3x3, Axis3d, Crosshair, Layers, Spline } from "lucide-react";
import { useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { formationStats } from "@/lib/geo/derive";
import { useExplorer, type CameraPreset } from "@/lib/geo/store";
import { m } from "./format";

export function LayerPanel() {
  const ds = useExplorer((s) => s.dataset);
  const layers = useExplorer((s) => s.layers);
  const selection = useExplorer((s) => s.selection);
  const { setLayer, soloLayer, showAllLayers, resetLayers, select } = useExplorer.getState();
  const stats = useMemo(() => formationStats(ds), [ds]);

  return (
    <section aria-labelledby="layers-h" className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 id="layers-h" className="eyebrow flex items-center gap-1.5"><Layers className="size-3.5" /> Formations</h2>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={showAllLayers}>Show all</Button>
          <Button size="sm" variant="ghost" className="h-6 px-2" onClick={resetLayers} aria-label="Reset layer settings"><RotateCcw className="size-3" /></Button>
        </div>
      </div>
      <ul className="space-y-1.5">
        {ds.formations.map((f, k) => {
          const L = layers[f.id];
          const st = stats[k];
          const active = selection?.kind === "formation" && selection.id === f.id;
          return (
            <li key={f.id} className={`rounded-md border p-2 transition-colors ${active ? "border-primary/70 bg-accent" : "border-hairline bg-card/40 hover:border-border"}`}>
              <div className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm ring-1 ring-foreground/10" style={{ background: f.color }} aria-hidden />
                <button
                  type="button"
                  className={`min-w-0 flex-1 truncate text-left text-sm ${L?.visible ? "" : "text-muted-foreground line-through"}`}
                  onClick={() => select({ kind: "formation", id: f.id })}
                >
                  {f.name}
                </button>
                <button type="button" className="eyebrow rounded px-1 hover:text-foreground" onClick={() => soloLayer(f.id)} aria-label={`Show only ${f.name}`}>solo</button>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setLayer(f.id, { visible: !L?.visible })}
                  aria-label={`${L?.visible ? "Hide" : "Show"} ${f.name}`}
                  aria-pressed={L?.visible}
                >
                  {L?.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Slider
                  value={[Math.round((L?.opacity ?? 1) * 100)]}
                  min={0} max={100} step={1}
                  onValueChange={([v]) => setLayer(f.id, { opacity: v / 100 })}
                  aria-label={`${f.name} opacity`}
                  className="flex-1"
                />
                <span className="num w-8 text-right text-[10px] text-muted-foreground">{Math.round((L?.opacity ?? 1) * 100)}%</span>
              </div>
              <div className="num mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>top {Math.round(st.topMin)}…{Math.round(st.topMax)} m</span>
                <span>Δ̄ {m(st.thicknessMean)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: "perspective", label: "Persp" },
  { id: "top", label: "Top" },
  { id: "front", label: "Front" },
  { id: "side", label: "Side" },
];

export function ViewControls() {
  const s = useExplorer();
  const toggles = [
    { key: "wireframe", label: "Wireframe", icon: Box },
    { key: "showGrid", label: "Grid", icon: Grid3x3 },
    { key: "showAxes", label: "Axes", icon: Axis3d },
    { key: "showWells", label: "Wells", icon: Crosshair },
    { key: "showSection", label: "Section plane", icon: Spline },
  ] as const;
  return (
    <section aria-labelledby="view-h" className="space-y-3">
      <h2 id="view-h" className="eyebrow">View</h2>
      <div className="grid grid-cols-4 gap-1">
        {PRESETS.map((p) => (
          <Button key={p.id} size="sm" variant={s.camera.preset === p.id && !s.camera.focusWell ? "secondary" : "outline"} className="h-7 text-[11px]" onClick={() => s.setCamera(p.id)}>
            {p.label}
          </Button>
        ))}
      </div>
      <Button size="sm" variant="outline" className="h-7 w-full text-[11px]" onClick={() => s.setCamera("perspective")}>
        <RotateCcw className="size-3" /> Reset / fit view
      </Button>
      <div className="space-y-2">
        {toggles.map(({ key, label, icon: Icon }) => (
          <label key={key} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground"><Icon className="size-3.5" />{label}</span>
            <Switch checked={s[key]} onCheckedChange={(v) => s.set({ [key]: v })} aria-label={label} />
          </label>
        ))}
      </div>
      <div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Vertical exaggeration</span>
          <span className="num text-foreground">{s.verticalExaggeration.toFixed(1)}×</span>
        </div>
        <Slider className="mt-2" value={[s.verticalExaggeration]} min={1} max={6} step={0.5} onValueChange={([v]) => s.set({ verticalExaggeration: v })} aria-label="Vertical exaggeration" />
      </div>
      <div>
        <div className="mb-1.5 text-sm text-muted-foreground">Background</div>
        <div className="grid grid-cols-3 gap-1">
          {(["navy", "black", "slate"] as const).map((b) => (
            <Button key={b} size="sm" variant={s.background === b ? "secondary" : "outline"} className="h-7 text-[11px] capitalize" onClick={() => s.set({ background: b })}>{b}</Button>
          ))}
        </div>
      </div>
    </section>
  );
}
