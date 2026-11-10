import { describe, expect, it } from "vitest";
import { crossSection, datasetSummary, deriveWell, formationStats } from "./derive";
import { toCsv, toJson, toUsda, usdName } from "./export";
import { generateDataset, makeGrid, MIN_THICKNESS, SCENARIOS } from "./generate";
import { sampleBilinear } from "./grid";
import { formationBlock, surfaceMesh, triangleCount, triangleNormal } from "./mesh";
import { parseCsvDataset, validateDataset } from "./validate";

describe("synthetic generator", () => {
  it("is deterministic", () => {
    expect(generateDataset("folded-formations", 32)).toEqual(generateDataset("folded-formations", 32));
  });

  it.each(SCENARIOS.map((s) => s.id))("%s: horizons never cross and keep ≥ MIN_THICKNESS", (id) => {
    const ds = generateDataset(id, 48);
    expect(ds.surfaces).toHaveLength(ds.formations.length + 1);
    for (let k = 1; k < ds.surfaces.length; k++)
      for (let p = 0; p < ds.surfaces[k].z.length; p++)
        expect(ds.surfaces[k - 1].z[p] - ds.surfaces[k].z[p]).toBeGreaterThanOrEqual(MIN_THICKNESS - 0.02);
  });

  it("builds a grid spanning 5000 × 4000 m", () => {
    const g = makeGrid(64);
    expect((g.nx - 1) * g.dx).toBeCloseTo(5000);
    expect((g.ny - 1) * g.dy).toBeCloseTo(4000);
  });

  it("generated datasets pass upload validation", () => {
    const ds = generateDataset("faulted-structure", 32);
    expect(validateDataset(JSON.parse(toJson(ds))).ok).toBe(true);
  });
});

describe("mesh generation", () => {
  const g = { nx: 4, ny: 3, x0: 0, y0: 0, dx: 10, dy: 10 };
  const z = new Array(12).fill(5);

  it("produces nx·ny vertices and 2 triangles per cell", () => {
    const m = surfaceMesh(g, z);
    expect(m.positions.length / 3).toBe(12);
    expect(triangleCount(m)).toBe(3 * 2 * 2);
    expect(Math.max(...m.indices)).toBe(11);
  });

  it("winds surface triangles to face +Z, flipped base to face −Z", () => {
    const up = surfaceMesh(g, z);
    const down = surfaceMesh(g, z, true);
    for (let t = 0; t < triangleCount(up); t++) {
      expect(triangleNormal(up, t)[2]).toBeGreaterThan(0);
      expect(triangleNormal(down, t)[2]).toBeLessThan(0);
    }
  });

  it("formation block has top + base + side walls with outward walls", () => {
    const ds = generateDataset("layered-basin", 16);
    const m = formationBlock(ds, 1);
    const cells = (ds.grid.nx - 1) * (ds.grid.ny - 1);
    const ring = 2 * (ds.grid.nx - 1) + 2 * (ds.grid.ny - 1);
    expect(triangleCount(m)).toBe(cells * 4 + ring * 2);
    // first side triangle sits on the south edge (y = 0): outward normal is −Y
    const n = triangleNormal(m, cells * 4);
    expect(n[1]).toBeLessThan(0);
  });
});

describe("thickness, wells and sections", () => {
  const ds = generateDataset("layered-basin", 48);

  it("mean thickness matches top − base", () => {
    const st = formationStats(ds);
    const k = 2;
    const mean = ds.surfaces[k].z.reduce((s, v, p) => s + v - ds.surfaces[k + 1].z[p], 0) / ds.surfaces[k].z.length;
    expect(st[k].thicknessMean).toBeCloseTo(mean, 6);
    expect(st[k].volume).toBeGreaterThan(0);
  });

  it("volume of a constant 10 m slab is area × 10", () => {
    const g = { nx: 3, ny: 3, x0: 0, y0: 0, dx: 50, dy: 50 };
    const flat = (v: number) => new Array(9).fill(v);
    const st = formationStats({
      ...ds, grid: g,
      formations: [ds.formations[0]],
      surfaces: [{ id: "a", name: "a", z: flat(10) }, { id: "b", name: "b", z: flat(0) }],
    });
    expect(st[0].volume).toBeCloseTo(100 * 100 * 10);
  });

  it("bilinear interpolation is exact on a plane", () => {
    const g = { nx: 5, ny: 5, x0: 0, y0: 0, dx: 1, dy: 1 };
    const zz = Array.from({ length: 25 }, (_, p) => 2 * (p % 5) + 3 * Math.floor(p / 5));
    expect(sampleBilinear(g, zz, 1.25, 2.5)).toBeCloseTo(2 * 1.25 + 3 * 2.5);
  });

  it("well intervals are contiguous from wellhead to TD", () => {
    const w = deriveWell(ds, 2);
    expect(w.intervals[0].topDepth).toBeCloseTo(0);
    for (let i = 1; i < w.intervals.length; i++) expect(w.intervals[i].topDepth).toBeCloseTo(w.intervals[i - 1].baseDepth);
    expect(w.intervals.at(-1)!.baseDepth).toBeCloseTo(w.totalDepth);
    expect(w.intervals.at(-1)!.formationId).toBe("basement");
    expect(w.wellheadZ).toBeCloseTo(sampleBilinear(ds.grid, ds.surfaces[0].z, w.x, w.y));
  });

  it("cross-section samples surfaces along A→B", () => {
    const cs = crossSection(ds, { ax: 0, ay: 2000, bx: 5000, by: 2000 }, 11);
    expect(cs.length).toBe(5000);
    expect(cs.distances[10]).toBe(5000);
    expect(cs.profiles).toHaveLength(ds.surfaces.length);
    expect(cs.profiles[0][0]).toBeCloseTo(sampleBilinear(ds.grid, ds.surfaces[0].z, 0, 2000));
  });

  it("summary counts samples and wells", () => {
    const s = datasetSummary(ds);
    expect(s.samples).toBe(ds.grid.nx * ds.grid.ny);
    expect(s.wells).toBe(5);
    expect(s.terrainRange).toBeCloseTo(s.terrainMax - s.terrainMin);
  });
});

describe("validation", () => {
  const ok = () => JSON.parse(toJson(generateDataset("layered-basin", 8)));

  it("reports missing samples instead of filling them", () => {
    const d = ok();
    d.surfaces[2].z[5] = null;
    const r = validateDataset(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join()).toMatch(/missing a sample/);
  });

  it("rejects wrong sample counts", () => {
    const d = ok();
    d.surfaces[1].z.pop();
    expect(validateDataset(d).ok).toBe(false);
  });

  it("rejects inverted horizons", () => {
    const d = ok();
    d.surfaces[3].z[0] = d.surfaces[2].z[0] + 50;
    const r = validateDataset(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/Invalid horizon order/);
  });

  it("round-trips CSV export → import", () => {
    const ds = generateDataset("folded-formations", 12);
    const r = parseCsvDataset(toCsv(ds));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.dataset.grid.nx).toBe(ds.grid.nx);
      expect(r.dataset.surfaces[3].z[7]).toBeCloseTo(ds.surfaces[3].z[7], 2);
    }
  });

  it("CSV: missing column and inconsistent grid are reported", () => {
    expect(parseCsvDataset("x,terrain,base\n0,1,0\n").ok).toBe(false);
    const r = parseCsvDataset("x,y,t,b\n0,0,10,0\n1,0,10,0\n0,1,10,0\n");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/Inconsistent grid/);
  });
});

describe("USDA export", () => {
  it("writes a Z-up metre-scale stage with one mesh per formation", () => {
    const ds = generateDataset("layered-basin", 8);
    const u = toUsda(ds);
    expect(u.startsWith("#usda 1.0")).toBe(true);
    expect(u).toMatch(/upAxis = "Z"/);
    expect(u).toMatch(/metersPerUnit = 1/);
    expect(u.match(/def Mesh /g)).toHaveLength(5);
    expect(u.match(/def BasisCurves /g)).toHaveLength(5);
  });

  it("sanitises prim names", () => {
    expect(usdName("GS-01")).toBe("GS_01");
    expect(usdName("1abc")).toBe("_1abc");
  });
});
