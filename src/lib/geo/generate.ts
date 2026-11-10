import { gridIndex, gridX, gridY } from "./grid";
import type { Formation, GeoDataset, GridSpec, Surface, WellSpec } from "./types";

/**
 * Deterministic synthetic dataset generator.
 *
 * Every field is built from a seeded PRNG (mulberry32) driving a sum of
 * sinusoidal components, so the same (scenario, resolution) always produces
 * identical numbers. None of this represents a real formation.
 */

export type ScenarioId = "layered-basin" | "folded-formations" | "faulted-structure";

export const SCENARIOS: { id: ScenarioId; name: string; summary: string; seed: number }[] = [
  {
    id: "layered-basin",
    name: "Layered Basin",
    summary: "Gently varying terrain over mostly horizontal strata with a slight eastward dip.",
    seed: 1307,
  },
  {
    id: "folded-formations",
    name: "Folded Formations",
    summary:
      "An anticline–syncline pair. Unit thicknesses stay near-constant; the sandstone is truncated where the fold crest meets the overburden.",
    seed: 2711,
  },
  {
    id: "faulted-structure",
    name: "Faulted Structure",
    summary:
      "A planar normal fault striking roughly N–S. Subsurface horizons east of the fault are dropped by a fixed throw; terrain is not offset.",
    seed: 4093,
  },
];

export const RESOLUTIONS = [32, 64, 96, 128] as const;
export const DEFAULT_RESOLUTION = 64;

export const EXTENT_X = 5000; // m
export const EXTENT_Y = 4000; // m
export const MIN_THICKNESS = 2; // m, enforced between consecutive horizons

export const DEMO_FORMATIONS: Formation[] = [
  {
    id: "overburden",
    name: "Overburden",
    color: "#a08a6a",
    description: "Unconsolidated soil and weathered sediment from the terrain surface down.",
  },
  {
    id: "sandstone",
    name: "Sandstone",
    color: "#d2a35a",
    description: "Medium-grained clastic unit. Low synthetic gamma ray.",
  },
  {
    id: "shale",
    name: "Shale",
    color: "#5f7a6e",
    description: "Fine-grained, clay-rich unit. High synthetic gamma ray, acts as a seal.",
  },
  {
    id: "limestone",
    name: "Limestone",
    color: "#a9b3b8",
    description: "Carbonate unit. Lowest synthetic gamma ray, highest density.",
  },
  {
    id: "basement",
    name: "Basement",
    color: "#7a4b4b",
    description: "Crystalline basement down to the flat model base.",
  },
];

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Smooth random field: sum of `n` plane waves with seeded direction, wavelength and phase. */
export function sinusoidField(seed: number, n: number, amplitude: number, minWave: number, maxWave: number) {
  const rnd = mulberry32(seed);
  const comps = Array.from({ length: n }, () => {
    const theta = rnd() * Math.PI * 2;
    const lambda = minWave + rnd() * (maxWave - minWave);
    const k = (Math.PI * 2) / lambda;
    return { kx: Math.cos(theta) * k, ky: Math.sin(theta) * k, phase: rnd() * Math.PI * 2, a: 0.5 + rnd() * 0.5 };
  });
  const norm = comps.reduce((s, c) => s + c.a, 0);
  return (x: number, y: number) =>
    (amplitude * comps.reduce((s, c) => s + c.a * Math.sin(c.kx * x + c.ky * y + c.phase), 0)) / norm;
}

export function makeGrid(resolution: number): GridSpec {
  const nx = Math.max(4, Math.round(resolution));
  const ny = Math.max(4, Math.round(resolution * (EXTENT_Y / EXTENT_X)));
  return { nx, ny, x0: 0, y0: 0, dx: EXTENT_X / (nx - 1), dy: EXTENT_Y / (ny - 1) };
}

/** Enforce top→bottom ordering with at least `minT` metres between consecutive surfaces. */
export function enforceOrdering(surfaces: number[][], minT = MIN_THICKNESS) {
  for (let k = 1; k < surfaces.length; k++) {
    const above = surfaces[k - 1];
    const cur = surfaces[k];
    for (let p = 0; p < cur.length; p++) if (cur[p] > above[p] - minT) cur[p] = above[p] - minT;
  }
}

/** Fault plane trace used by the faulted scenario. Returns true on the hanging-wall (east) side. */
export const faultHangingWall = (x: number, y: number) => x > 2600 + 0.25 * (y - 2000);
export const FAULT_THROW = 160; // m

export function generateDataset(id: ScenarioId, resolution = DEFAULT_RESOLUTION): GeoDataset {
  const sc = SCENARIOS.find((s) => s.id === id);
  if (!sc) throw new Error(`Unknown scenario: ${id}`);
  const g = makeGrid(resolution);
  const N = g.nx * g.ny;
  const seed = sc.seed;

  const terrainNoise = sinusoidField(seed, 7, 38, 900, 3200);
  const structNoise = sinusoidField(seed + 1, 5, 14, 1500, 5000);
  const sandT = sinusoidField(seed + 2, 4, 30, 2000, 6000);
  const shaleT = sinusoidField(seed + 3, 4, 35, 2000, 6000);
  const limeT = sinusoidField(seed + 4, 4, 25, 2000, 6000);

  const s = Array.from({ length: 5 }, () => new Array<number>(N));
  for (let j = 0; j < g.ny; j++) {
    for (let i = 0; i < g.nx; i++) {
      const x = gridX(g, i);
      const y = gridY(g, j);
      const p = gridIndex(g, i, j);
      const terrain = 430 + terrainNoise(x, y) + 0.004 * x;

      // Structural datum: top of shale.
      let H: number;
      if (id === "layered-basin") {
        H = 160 - 0.018 * x + structNoise(x, y);
      } else if (id === "folded-formations") {
        H = 120 + 120 * Math.sin((2 * Math.PI * x) / 2800 + 0.6) * (0.75 + 0.25 * Math.cos((2 * Math.PI * y) / 5200)) + structNoise(x, y) * 0.5;
      } else {
        H = 170 - 0.012 * x + structNoise(x, y) - (faultHangingWall(x, y) ? FAULT_THROW : 0);
      }

      s[0][p] = terrain;
      s[1][p] = Math.min(H + 170 + sandT(x, y), terrain - 25); // top sandstone (base of overburden)
      s[2][p] = H; // top shale
      s[3][p] = H - (240 + shaleT(x, y)); // top limestone
      s[4][p] = s[3][p] - (200 + limeT(x, y)); // top basement
    }
  }
  enforceOrdering(s);
  const basementTopMin = Math.min(...s[4]);
  const base = new Array<number>(N).fill(Math.floor((basementTopMin - 300) / 10) * 10);
  const all = [...s, base];

  const names = ["Terrain", "Top Sandstone", "Top Shale", "Top Limestone", "Top Basement", "Model Base"];
  const ids = ["terrain", "top_sandstone", "top_shale", "top_limestone", "top_basement", "model_base"];
  const surfaces: Surface[] = all.map((z, k) => ({ id: ids[k], name: names[k], z: z.map((v) => Math.round(v * 100) / 100) }));

  const wellSites: [string, number, number][] =
    id === "faulted-structure"
      ? [["GS-01", 900, 1100], ["GS-02", 1900, 2900], ["GS-03", 3300, 1500], ["GS-04", 4200, 3000], ["GS-05", 2500, 600]]
      : [["GS-01", 800, 900], ["GS-02", 1700, 2800], ["GS-03", 2600, 1800], ["GS-04", 3600, 3100], ["GS-05", 4300, 1200]];

  const wells: WellSpec[] = wellSites.map(([wid, x, y]) => {
    // TD = 120 m into basement, rounded to 10 m.
    const i = Math.round(x / g.dx);
    const j = Math.round(y / g.dy);
    const p = gridIndex(g, Math.min(i, g.nx - 1), Math.min(j, g.ny - 1));
    const td = Math.ceil((surfaces[0].z[p] - surfaces[4].z[p] + 120) / 10) * 10;
    return { id: wid, name: `${wid} (synthetic)`, x, y, totalDepth: td };
  });

  return {
    id,
    name: sc.name,
    description: sc.summary,
    source: "synthetic",
    units: "m",
    grid: g,
    formations: DEMO_FORMATIONS,
    surfaces,
    wells,
    parameters: {
      seed,
      resolution,
      extentX: EXTENT_X,
      extentY: EXTENT_Y,
      minThickness: MIN_THICKNESS,
      ...(id === "faulted-structure" ? { faultThrow: FAULT_THROW, faultTrace: "x = 2600 + 0.25·(y − 2000)" } : {}),
    },
  };
}
