import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { datasetSummary, deriveWell, formationStats } from "@/lib/geo/derive";
import { useExplorer } from "@/lib/geo/store";
import { CrossSectionPanel } from "./CrossSectionPanel";
import { km3, n } from "./format";

export function triangleTotal(nx: number, ny: number, formations: number) {
  const cells = (nx - 1) * (ny - 1);
  const ring = 2 * (nx - 1) + 2 * (ny - 1);
  return formations * (cells * 4 + ring * 2);
}

const tooltipStyle = {
  contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 },
  labelStyle: { color: "var(--foreground)" },
  itemStyle: { color: "var(--foreground)" },
};

function Analytics() {
  const ds = useExplorer((s) => s.dataset);
  const layers = useExplorer((s) => s.layers);
  const stats = useMemo(() => formationStats(ds), [ds]);
  const sum = useMemo(() => datasetSummary(ds), [ds]);
  const wells = useMemo(() => ds.wells.map((_, i) => deriveWell(ds, i, 50)), [ds]);
  const visible = ds.formations.filter((f) => layers[f.id]?.visible).length;
  const metrics = [
    ["Grid samples", n(sum.samples)],
    ["Surface samples", n(sum.surfaceSamples)],
    ["Formations", `${visible} / ${sum.formations} visible`],
    ["Mesh triangles", n(triangleTotal(ds.grid.nx, ds.grid.ny, ds.formations.length))],
    ["Terrain range", `${n(sum.terrainMin)}–${n(sum.terrainMax)} m`],
    ["Model size", `${n(sum.width / 1000, 1)} × ${n(sum.length / 1000, 1)} × ${n(sum.height / 1000, 2)} km`],
  ];
  const thick = stats.map((s) => ({ name: s.name, mean: Math.round(s.thicknessMean), min: Math.round(s.thicknessMin), max: Math.round(s.thicknessMax), color: s.color }));
  const vol = stats.map((s) => ({ name: s.name, v: +(s.volume / 1e9).toFixed(3), color: s.color }));
  const depth = wells.map((w) => ({ name: w.id, td: w.totalDepth }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([k, v]) => (
          <div key={k} className="rounded-md border border-hairline bg-card/50 px-3 py-2">
            <div className="eyebrow">{k}</div>
            <div className="num mt-1 text-sm">{v}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Chart title="Mean thickness (m)">
          <BarChart data={thick}>
            <CartesianGrid stroke="var(--hairline)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={36} />
            <Tooltip {...tooltipStyle} cursor={{ fill: "var(--accent)" }} formatter={(v, _k, p) => [`${v} m (min ${p.payload.min}, max ${p.payload.max})`, "mean"]} />
            <Bar dataKey="mean" radius={[3, 3, 0, 0]}>{thick.map((d) => <Cell key={d.name} fill={d.color} />)}</Bar>
          </BarChart>
        </Chart>
        <Chart title="Approx. volume (km³)">
          <BarChart data={vol}>
            <CartesianGrid stroke="var(--hairline)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} interval={0} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={36} />
            <Tooltip {...tooltipStyle} cursor={{ fill: "var(--accent)" }} formatter={(v) => [km3(Number(v) * 1e9), "volume"]} />
            <Bar dataKey="v" radius={[3, 3, 0, 0]}>{vol.map((d) => <Cell key={d.name} fill={d.color} />)}</Bar>
          </BarChart>
        </Chart>
        <Chart title="Well total depth (m)">
          <BarChart data={depth}>
            <CartesianGrid stroke="var(--hairline)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={36} />
            <Tooltip {...tooltipStyle} cursor={{ fill: "var(--accent)" }} />
            <Bar dataKey="td" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </Chart>
      </div>
      <p className="text-[11px] text-muted-foreground">Volumes: trapezoidal integration of node thickness over the grid. Geometric estimates of synthetic surfaces only.</p>
    </div>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="rounded-md border border-hairline bg-card/40 p-3">
      <div className="eyebrow mb-2">{title}</div>
      <div className="h-40"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}

function Metadata() {
  const ds = useExplorer((s) => s.dataset);
  const rows: [string, string][] = [
    ["Name", ds.name],
    ["Source", ds.source === "synthetic" ? "Synthetic (deterministic generator)" : "User upload (browser only)"],
    ["CRS", "Local Cartesian. X = easting, Y = northing, Z = elevation. Metres."],
    ["Grid origin", `(${ds.grid.x0}, ${ds.grid.y0})`],
    ["Grid", `${ds.grid.nx} × ${ds.grid.ny} @ ${n(ds.grid.dx, 2)} × ${n(ds.grid.dy, 2)} m`],
    ["Surfaces (top → bottom)", ds.surfaces.map((s) => s.name).join(" → ")],
    ...Object.entries(ds.parameters ?? {}).map(([k, v]) => [`param.${k}`, String(v)] as [string, string]),
  ];
  return (
    <dl className="grid gap-x-8 gap-y-1 text-sm md:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 border-b border-hairline py-1.5">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="num text-right text-[12px]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Events() {
  const events = useExplorer((s) => s.events);
  return (
    <ol className="num max-h-56 space-y-1 overflow-auto text-[12px]" aria-live="polite">
      {events.map((e, i) => (
        <li key={i} className="flex gap-3">
          <span className="text-muted-foreground">{new Date(e.t).toLocaleTimeString()}</span>
          <span className={e.level === "error" ? "text-destructive" : e.level === "success" ? "text-success" : "text-foreground"}>{e.msg}</span>
        </li>
      ))}
    </ol>
  );
}

export function BottomPanel() {
  const [open, setOpen] = useState(true);
  return (
    <Tabs defaultValue="section" className="flex min-h-0 flex-col gap-0">
      <div className="flex items-center justify-between border-b border-border px-3">
        <TabsList className="h-9 bg-transparent p-0">
          {[["section", "Cross-section"], ["analytics", "Analytics"], ["metadata", "Metadata"], ["events", "Event log"]].map(([v, l]) => (
            <TabsTrigger key={v} value={v} onClick={() => setOpen(true)} className="h-9 rounded-none border-b-2 border-transparent px-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{l}</TabsTrigger>
          ))}
        </TabsList>
        <Button size="icon" variant="ghost" className="size-7" onClick={() => setOpen((o) => !o)} aria-label={open ? "Collapse panel" : "Expand panel"} aria-expanded={open}>
          {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </Button>
      </div>
      {open && (
        <div className="max-h-[42vh] overflow-auto p-3">
          <TabsContent value="section" className="mt-0"><CrossSectionPanel /></TabsContent>
          <TabsContent value="analytics" className="mt-0"><Analytics /></TabsContent>
          <TabsContent value="metadata" className="mt-0"><Metadata /></TabsContent>
          <TabsContent value="events" className="mt-0"><Events /></TabsContent>
        </div>
      )}
    </Tabs>
  );
}
