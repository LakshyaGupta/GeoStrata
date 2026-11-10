import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { crossSection, type SectionLine } from "@/lib/geo/derive";
import { gridExtent } from "@/lib/geo/grid";
import { defaultSection, useExplorer } from "@/lib/geo/store";
import { n } from "./format";

/** Top-down terrain map. Click once to place A, again to place B. */
function SectionMap() {
  const ds = useExplorer((s) => s.dataset);
  const line = useExplorer((s) => s.section);
  const setSection = useExplorer((s) => s.setSection);
  const wells = ds.wells;
  const canvas = useRef<HTMLCanvasElement>(null);
  const [pendingA, setPendingA] = useState<{ x: number; y: number } | null>(null);
  const e = gridExtent(ds.grid);
  const W = e.xMax - e.xMin, H = e.yMax - e.yMin;

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const g = ds.grid;
    c.width = g.nx;
    c.height = g.ny;
    const ctx = c.getContext("2d")!;
    const img = ctx.createImageData(g.nx, g.ny);
    const z = ds.surfaces[0].z;
    let lo = Infinity, hi = -Infinity;
    for (const v of z) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    for (let j = 0; j < g.ny; j++)
      for (let i = 0; i < g.nx; i++) {
        const t = (z[j * g.nx + i] - lo) / (hi - lo || 1);
        const row = g.ny - 1 - j; // north up
        const o = (row * g.nx + i) * 4;
        // muted earth ramp for elevation
        img.data[o] = 40 + t * 150;
        img.data[o + 1] = 52 + t * 125;
        img.data[o + 2] = 62 + t * 80;
        img.data[o + 3] = 255;
      }
    ctx.putImageData(img, 0, 0);
  }, [ds]);

  const toWorld = (ev: React.MouseEvent<SVGSVGElement>) => {
    const r = ev.currentTarget.getBoundingClientRect();
    return { x: e.xMin + ((ev.clientX - r.left) / r.width) * W, y: e.yMax - ((ev.clientY - r.top) / r.height) * H };
  };
  const px = (x: number) => ((x - e.xMin) / W) * 100;
  const py = (y: number) => ((e.yMax - y) / H) * 100;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-md border border-border" style={{ aspectRatio: `${W} / ${H}` }}>
        <canvas ref={canvas} className="absolute inset-0 size-full [image-rendering:pixelated]" aria-hidden />
        <svg
          viewBox="0 0 100 100" preserveAspectRatio="none"
          className="absolute inset-0 size-full cursor-crosshair"
          role="application"
          aria-label="Section map. Click to set point A, then click to set point B."
          onClick={(ev) => {
            const p = toWorld(ev);
            if (!pendingA) setPendingA(p);
            else {
              if (Math.hypot(p.x - pendingA.x, p.y - pendingA.y) > 10) setSection({ ax: pendingA.x, ay: pendingA.y, bx: p.x, by: p.y });
              setPendingA(null);
            }
          }}
        >
          {!pendingA && <line x1={px(line.ax)} y1={py(line.ay)} x2={px(line.bx)} y2={py(line.by)} className="stroke-primary" strokeWidth={0.8} vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2 }} />}
          {wells.map((w) => (
            <circle key={w.id} cx={px(w.x)} cy={py(w.y)} r={1} className="fill-foreground" />
          ))}
          {pendingA && <circle cx={px(pendingA.x)} cy={py(pendingA.y)} r={1.5} className="fill-primary" />}
        </svg>
        {!pendingA && (["A", "B"] as const).map((l) => (
          <span key={l} className="num pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-primary px-1 text-[9px] font-bold text-primary-foreground"
            style={{ left: `${px(l === "A" ? line.ax : line.bx)}%`, top: `${py(l === "A" ? line.ay : line.by)}%` }}>{l}</span>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">{pendingA ? "Click to place point B." : "Click the map twice to draw a new A–B line. North is up."}</p>
    </div>
  );
}

function presets(ds: ReturnType<typeof useExplorer.getState>["dataset"]): { label: string; line: SectionLine }[] {
  const e = gridExtent(ds.grid);
  const xm = (e.xMin + e.xMax) / 2;
  return [
    { label: "W–E", line: defaultSection(ds) },
    { label: "S–N", line: { ax: xm, ay: e.yMin, bx: xm, by: e.yMax } },
    { label: "SW–NE", line: { ax: e.xMin, ay: e.yMin, bx: e.xMax, by: e.yMax } },
  ];
}

export function CrossSectionPanel() {
  const ds = useExplorer((s) => s.dataset);
  const line = useExplorer((s) => s.section);
  const layers = useExplorer((s) => s.layers);
  const vexScene = useExplorer((s) => s.verticalExaggeration);
  const setSection = useExplorer((s) => s.setSection);
  const cs = useMemo(() => crossSection(ds, line, 240), [ds, line]);
  const [hover, setHover] = useState<number | null>(null);

  const W = 900, H = 260, pl = 52, pr = 14, pt = 12, pb = 30;
  let zLo = Infinity, zHi = -Infinity;
  for (const p of cs.profiles) for (const v of p) { zLo = Math.min(zLo, v); zHi = Math.max(zHi, v); }
  zLo = Math.floor(zLo / 100) * 100;
  zHi = Math.ceil(zHi / 100) * 100;
  const sx = (d: number) => pl + (d / cs.length) * (W - pl - pr);
  const sz = (z: number) => pt + ((zHi - z) / (zHi - zLo)) * (H - pt - pb);
  const ve = ((W - pl - pr) / cs.length) > 0 ? ((H - pt - pb) / (zHi - zLo)) / ((W - pl - pr) / cs.length) : 1;

  const polys = ds.formations.map((f, k) => {
    const top = cs.profiles[k], base = cs.profiles[k + 1];
    const pts = [
      ...top.map((z, i) => `${sx(cs.distances[i]).toFixed(1)},${sz(z).toFixed(1)}`),
      ...base.map((z, i) => `${sx(cs.distances[i]).toFixed(1)},${sz(z).toFixed(1)}`).reverse(),
    ];
    return { f, pts: pts.join(" "), visible: layers[f.id]?.visible ?? true, opacity: layers[f.id]?.opacity ?? 1 };
  });
  const zTicks: number[] = [];
  const step = (zHi - zLo) > 1200 ? 200 : 100;
  for (let z = zLo; z <= zHi; z += step) zTicks.push(z);
  const dStep = cs.length > 3000 ? 1000 : 500;
  const dTicks: number[] = [];
  for (let d = 0; d <= cs.length; d += dStep) dTicks.push(d);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <div className="space-y-3">
        <SectionMap />
        <div className="flex flex-wrap gap-1">
          {presets(ds).map((p) => (
            <Button key={p.label} size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setSection(p.line)}>{p.label}</Button>
          ))}
        </div>
        <div className="num text-[11px] text-muted-foreground">
          A ({n(line.ax)}, {n(line.ay)}) → B ({n(line.bx)}, {n(line.by)})<br />Length {n(cs.length)} m · {cs.distances.length} samples
        </div>
      </div>
      <figure className="min-w-0">
        <svg
          viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md border border-hairline bg-viewport"
          role="img" aria-label="Geological cross-section along the A–B line"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width) * W;
            const t = (x - pl) / (W - pl - pr);
            setHover(t >= 0 && t <= 1 ? Math.round(t * (cs.distances.length - 1)) : null);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {zTicks.map((z) => (
            <g key={z}>
              <line x1={pl} x2={W - pr} y1={sz(z)} y2={sz(z)} className="stroke-hairline" />
              <text x={pl - 6} y={sz(z) + 3} textAnchor="end" fontSize={10} className="num fill-muted-foreground">{z}</text>
            </g>
          ))}
          {dTicks.map((d) => (
            <text key={d} x={sx(d)} y={H - 12} textAnchor="middle" fontSize={10} className="num fill-muted-foreground">{d}</text>
          ))}
          {polys.map(({ f, pts, visible, opacity }) => visible && <polygon key={f.id} points={pts} fill={f.color} fillOpacity={Math.max(0.15, opacity)} className="stroke-background" strokeWidth={0.5} />)}
          <text x={pl} y={H - 1} fontSize={10} className="fill-muted-foreground">Distance along A→B (m)</text>
          <text x={12} y={pt + 4} fontSize={10} className="fill-muted-foreground" transform={`rotate(-90 12 ${pt + 4})`} textAnchor="end">Elevation (m)</text>
          <text x={pl + 4} y={pt + 12} fontSize={11} className="fill-primary num font-semibold">A</text>
          <text x={W - pr - 4} y={pt + 12} fontSize={11} textAnchor="end" className="fill-primary num font-semibold">B</text>
          {hover !== null && (
            <g>
              <line x1={sx(cs.distances[hover])} x2={sx(cs.distances[hover])} y1={pt} y2={H - pb} className="stroke-foreground" strokeDasharray="3 3" />
            </g>
          )}
        </svg>
        <figcaption className="mt-1.5 flex flex-wrap items-start justify-between gap-2 text-[11px] text-muted-foreground">
          <span>Vertical exaggeration in this chart: <span className="num text-foreground">{ve.toFixed(1)}×</span> (3D view: {vexScene.toFixed(1)}×). Bilinear interpolation of each surface.</span>
          {hover !== null && (
            <span className="num text-foreground">
              d={n(cs.distances[hover])} m · terrain {n(cs.profiles[0][hover], 1)} m ·{" "}
              {ds.formations.map((f, k) => `${f.name} ${n(cs.profiles[k][hover] - cs.profiles[k + 1][hover], 0)}`).join(" · ")} m thick
            </span>
          )}
        </figcaption>
      </figure>
    </div>
  );
}
