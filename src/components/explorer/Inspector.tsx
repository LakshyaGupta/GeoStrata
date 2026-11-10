import { Crosshair, X } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { datasetSummary, deriveWell, formationStats } from "@/lib/geo/derive";
import { useExplorer } from "@/lib/geo/store";
import type { DerivedWell } from "@/lib/geo/types";
import { km3, m, n } from "./format";

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-hairline py-1.5 text-sm last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="num text-right text-[13px]">{v}</dd>
    </div>
  );
}

export function Inspector() {
  const ds = useExplorer((s) => s.dataset);
  const sel = useExplorer((s) => s.selection);
  const layers = useExplorer((s) => s.layers);
  const { select, setCamera } = useExplorer.getState();
  const summary = useMemo(() => datasetSummary(ds), [ds]);
  const stats = useMemo(() => formationStats(ds), [ds]);

  if (sel?.kind === "formation") {
    const k = ds.formations.findIndex((f) => f.id === sel.id);
    const f = ds.formations[k];
    const st = stats[k];
    if (!f) return null;
    return (
      <div className="space-y-4">
        <Header eyebrow="Formation" title={f.name} swatch={f.color} onClose={() => select(null)} />
        {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
        <dl>
          <Row k="Top elevation" v={`${n(st.topMin)} … ${m(st.topMax)}`} />
          <Row k="Base elevation" v={`${n(st.baseMin)} … ${m(st.baseMax)}`} />
          <Row k="Thickness min / max" v={`${n(st.thicknessMin, 1)} / ${m(st.thicknessMax, 1)}`} />
          <Row k="Mean thickness" v={m(st.thicknessMean, 1)} />
          <Row k="Approx. volume*" v={km3(st.volume)} />
          <Row k="Visible" v={layers[f.id]?.visible ? "yes" : "no"} />
          <Row k="Opacity" v={`${Math.round((layers[f.id]?.opacity ?? 1) * 100)}%`} />
          <Row k="Bounding surfaces" v={`${ds.surfaces[k].name} → ${ds.surfaces[k + 1].name}`} />
          <Row k="Source" v={ds.name} />
        </dl>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          *Trapezoidal sum of node thickness × cell area ({n(ds.grid.dx, 1)} × {n(ds.grid.dy, 1)} m). Geometric estimate of synthetic data, not a resource quantity.
        </p>
      </div>
    );
  }

  if (sel?.kind === "well") {
    const i = ds.wells.findIndex((w) => w.id === sel.id);
    if (i < 0) return null;
    return <WellInspector well={deriveWell(ds, i)} onClose={() => select(null)} onFocus={() => setCamera("perspective", sel.id)} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="eyebrow">Dataset</div>
        <h2 className="mt-1 text-lg font-semibold tracking-tight">{ds.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{ds.description}</p>
      </div>
      <dl>
        <Row k="Grid" v={`${ds.grid.nx} × ${ds.grid.ny}`} />
        <Row k="Grid samples" v={n(summary.samples)} />
        <Row k="Spacing" v={`${n(ds.grid.dx, 1)} × ${m(ds.grid.dy, 1)}`} />
        <Row k="Extent" v={`${n(summary.width)} × ${m(summary.length)}`} />
        <Row k="Terrain min / max" v={`${n(summary.terrainMin, 1)} / ${m(summary.terrainMax, 1)}`} />
        <Row k="Terrain relief" v={m(summary.terrainRange, 1)} />
        <Row k="Model base" v={m(summary.zMin)} />
        <Row k="Formations" v={summary.formations} />
        <Row k="Wells" v={summary.wells} />
        <Row k="Visible layers" v={`${Object.values(layers).filter((l) => l.visible).length} / ${ds.formations.length}`} />
      </dl>
      <div>
        <div className="eyebrow mb-2">Wells</div>
        <div className="flex flex-wrap gap-1.5">
          {ds.wells.map((w) => (
            <Button key={w.id} size="sm" variant="outline" className="num h-7 text-[11px]" onClick={() => select({ kind: "well", id: w.id })}>{w.id}</Button>
          ))}
          {ds.wells.length === 0 && <span className="text-sm text-muted-foreground">No wells in this dataset.</span>}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">Click a formation or well in the 3D view to inspect it. Units: metres; Z is absolute elevation.</p>
    </div>
  );
}

function Header({ eyebrow, title, swatch, onClose }: { eyebrow: string; title: string; swatch?: string; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
          {swatch && <span className="size-3 rounded-sm" style={{ background: swatch }} aria-hidden />}
          {title}
        </h2>
      </div>
      <Button size="icon" variant="ghost" className="size-7" onClick={onClose} aria-label="Clear selection"><X className="size-4" /></Button>
    </div>
  );
}

function WellInspector({ well, onClose, onFocus }: { well: DerivedWell; onClose: () => void; onFocus: () => void }) {
  return (
    <div className="space-y-4">
      <Header eyebrow="Synthetic well" title={well.id} onClose={onClose} />
      <dl>
        <Row k="Wellhead X / Y" v={`${n(well.x)} / ${m(well.y)}`} />
        <Row k="Wellhead elevation" v={m(well.wellheadZ, 1)} />
        <Row k="Total depth (MD)" v={m(well.totalDepth)} />
        <Row k="TD elevation" v={m(well.tdZ, 1)} />
      </dl>
      <Button size="sm" variant="outline" className="h-7 w-full text-[11px]" onClick={onFocus}><Crosshair className="size-3" /> Focus camera on well</Button>
      <div>
        <div className="eyebrow mb-2">Formation intersections</div>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-left text-muted-foreground"><th className="py-1 font-normal">Formation</th><th className="num py-1 text-right font-normal">Top MD</th><th className="num py-1 text-right font-normal">Thick.</th></tr>
          </thead>
          <tbody>
            {well.intervals.map((iv) => (
              <tr key={iv.formationId} className="border-t border-hairline">
                <td className="py-1"><span className="mr-1.5 inline-block size-2 rounded-sm" style={{ background: iv.color }} />{iv.formationName}</td>
                <td className="num py-1 text-right">{n(iv.topDepth, 1)}</td>
                <td className="num py-1 text-right">{n(iv.baseDepth - iv.topDepth, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <WellLog well={well} />
    </div>
  );
}

/** Synthetic GR + density log drawn directly from the derived samples. */
export function WellLog({ well }: { well: DerivedWell }) {
  const W = 280, H = 300, padT = 18, padB = 8, trackW = 100, lithW = 26, gap = 10;
  const y = (d: number) => padT + (d / well.totalDepth) * (H - padT - padB);
  const grX = (v: number) => lithW + gap + (Math.min(v, 150) / 150) * trackW;
  const rhoX = (v: number) => lithW + gap * 2 + trackW + ((v - 1.8) / (3.0 - 1.8)) * trackW;
  const grPath = well.log.map((s, i) => `${i ? "L" : "M"}${grX(s.gammaRay).toFixed(1)},${y(s.depth).toFixed(1)}`).join("");
  const rhoPath = well.log.map((s, i) => `${i ? "L" : "M"}${rhoX(s.density).toFixed(1)},${y(s.depth).toFixed(1)}`).join("");
  return (
    <figure>
      <div className="eyebrow mb-2">Synthetic well log</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md border border-hairline bg-viewport" role="img" aria-label={`Synthetic gamma ray and density log for ${well.id}`}>
        {well.intervals.map((iv) => (
          <rect key={iv.formationId} x={0} y={y(iv.topDepth)} width={lithW} height={y(iv.baseDepth) - y(iv.topDepth)} fill={iv.color} />
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={lithW} x2={W} y1={y(t * well.totalDepth)} y2={y(t * well.totalDepth)} className="stroke-hairline" />
            <text x={lithW + 2} y={y(t * well.totalDepth) - 2} className="fill-muted-foreground num" fontSize={7}>{Math.round(t * well.totalDepth)} m</text>
          </g>
        ))}
        <path d={grPath} fill="none" className="stroke-chart-2" strokeWidth={1} />
        <path d={rhoPath} fill="none" className="stroke-chart-1" strokeWidth={1} />
        <text x={lithW + gap} y={10} fontSize={8} className="fill-chart-2 num">GR 0–150 API</text>
        <text x={lithW + gap * 2 + trackW} y={10} fontSize={8} className="fill-chart-1 num">ρb 1.8–3.0 g/cm³</text>
      </svg>
      <figcaption className="mt-1 text-[11px] text-muted-foreground">Per-formation baseline + seeded noise every 5 m. Not measured data.</figcaption>
    </figure>
  );
}
