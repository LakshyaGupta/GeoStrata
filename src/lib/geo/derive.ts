import { gridExtent, gridIndex, sampleBilinear, trapezoidWeight } from "./grid";
import { mulberry32 } from "./generate";
import type { DerivedWell, GeoDataset, LogSample, WellInterval } from "./types";

export interface FormationStats {
  id: string;
  name: string;
  color: string;
  topMin: number;
  topMax: number;
  baseMin: number;
  baseMax: number;
  thicknessMin: number;
  thicknessMax: number;
  thicknessMean: number;
  /** Approximate volume (m³): trapezoidal rule over node thickness × cell area. */
  volume: number;
}

export function formationStats(ds: GeoDataset): FormationStats[] {
  const g = ds.grid;
  const cell = g.dx * g.dy;
  return ds.formations.map((f, k) => {
    const top = ds.surfaces[k].z;
    const base = ds.surfaces[k + 1].z;
    let tMin = Infinity, tMax = -Infinity, tSum = 0, vol = 0;
    let topMin = Infinity, topMax = -Infinity, baseMin = Infinity, baseMax = -Infinity;
    for (let j = 0; j < g.ny; j++)
      for (let i = 0; i < g.nx; i++) {
        const p = gridIndex(g, i, j);
        const t = top[p] - base[p];
        tMin = Math.min(tMin, t);
        tMax = Math.max(tMax, t);
        tSum += t;
        vol += t * cell * trapezoidWeight(g, i, j);
        topMin = Math.min(topMin, top[p]);
        topMax = Math.max(topMax, top[p]);
        baseMin = Math.min(baseMin, base[p]);
        baseMax = Math.max(baseMax, base[p]);
      }
    return {
      id: f.id, name: f.name, color: f.color,
      topMin, topMax, baseMin, baseMax,
      thicknessMin: tMin, thicknessMax: tMax, thicknessMean: tSum / top.length,
      volume: vol,
    };
  });
}

export function datasetSummary(ds: GeoDataset) {
  const terrain = ds.surfaces[0].z;
  const base = ds.surfaces[ds.surfaces.length - 1].z;
  let tMin = Infinity, tMax = -Infinity, bMin = Infinity;
  for (let p = 0; p < terrain.length; p++) {
    tMin = Math.min(tMin, terrain[p]);
    tMax = Math.max(tMax, terrain[p]);
    bMin = Math.min(bMin, base[p]);
  }
  const e = gridExtent(ds.grid);
  return {
    samples: ds.grid.nx * ds.grid.ny,
    surfaceSamples: ds.grid.nx * ds.grid.ny * ds.surfaces.length,
    formations: ds.formations.length,
    wells: ds.wells.length,
    terrainMin: tMin,
    terrainMax: tMax,
    terrainRange: tMax - tMin,
    width: e.xMax - e.xMin,
    length: e.yMax - e.yMin,
    height: tMax - bMin,
    zMin: bMin,
    zMax: tMax,
  };
}

const GR_BASE: Record<string, number> = { overburden: 70, sandstone: 42, shale: 112, limestone: 24, basement: 88 };
const RHO_BASE: Record<string, number> = { overburden: 1.95, sandstone: 2.32, shale: 2.48, limestone: 2.68, basement: 2.75 };

/** Intersect a vertical well with every formation and build a synthetic log every `step` m. */
export function deriveWell(ds: GeoDataset, wellIndex: number, step = 5): DerivedWell {
  const w = ds.wells[wellIndex];
  const g = ds.grid;
  const zs = ds.surfaces.map((s) => sampleBilinear(g, s.z, w.x, w.y));
  const wellheadZ = zs[0];
  const tdZ = wellheadZ - w.totalDepth;
  const intervals: WellInterval[] = [];
  ds.formations.forEach((f, k) => {
    const topZ = Math.min(zs[k], wellheadZ);
    const baseZ = Math.max(zs[k + 1], tdZ);
    if (topZ > baseZ)
      intervals.push({
        formationId: f.id, formationName: f.name, color: f.color,
        topZ, baseZ, topDepth: wellheadZ - topZ, baseDepth: wellheadZ - baseZ,
      });
  });

  const rnd = mulberry32(
    Array.from(w.id).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7),
  );
  const log: LogSample[] = [];
  let smooth = 0;
  for (let d = 0; d <= w.totalDepth; d += step) {
    const z = wellheadZ - d;
    const iv = intervals.find((v) => d >= v.topDepth && d <= v.baseDepth) ?? intervals[intervals.length - 1];
    const fid = iv?.formationId ?? "unknown";
    smooth = smooth * 0.6 + (rnd() - 0.5) * 0.4;
    const gr = (GR_BASE[fid] ?? 60) * (1 + smooth * 0.35);
    const rho = (RHO_BASE[fid] ?? 2.4) + smooth * 0.05;
    log.push({ depth: d, z, formationId: fid, gammaRay: Math.round(gr * 10) / 10, density: Math.round(rho * 1000) / 1000 });
  }
  return { ...w, wellheadZ, tdZ, intervals, log };
}

export interface SectionLine {
  ax: number; ay: number; bx: number; by: number;
}

export interface CrossSection {
  length: number;
  distances: number[];
  /** profiles[k][n] = elevation of surface k at sample n. */
  profiles: number[][];
  points: { x: number; y: number }[];
}

/** Sample every surface along A→B with bilinear interpolation. */
export function crossSection(ds: GeoDataset, line: SectionLine, samples = 200): CrossSection {
  const length = Math.hypot(line.bx - line.ax, line.by - line.ay);
  const distances: number[] = [];
  const points: { x: number; y: number }[] = [];
  for (let n = 0; n < samples; n++) {
    const t = samples === 1 ? 0 : n / (samples - 1);
    points.push({ x: line.ax + (line.bx - line.ax) * t, y: line.ay + (line.by - line.ay) * t });
    distances.push(length * t);
  }
  const profiles = ds.surfaces.map((s) => points.map((p) => sampleBilinear(ds.grid, s.z, p.x, p.y)));
  return { length, distances, profiles, points };
}
