import { z } from "zod";
import { gridExtent } from "./grid";
import type { Formation, GeoDataset } from "./types";

export const MAX_GRID = 256;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a #rrggbb colour");

export const UploadSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  units: z.literal("m").optional(),
  grid: z.object({
    nx: z.number().int().min(2).max(MAX_GRID),
    ny: z.number().int().min(2).max(MAX_GRID),
    x0: z.number().finite(),
    y0: z.number().finite(),
    dx: z.number().positive(),
    dy: z.number().positive(),
  }),
  formations: z
    .array(z.object({ id: z.string().min(1), name: z.string().min(1), color: hex, description: z.string().optional() }))
    .min(1)
    .max(16),
  surfaces: z.array(
    z.object({ id: z.string().min(1), name: z.string().min(1), z: z.array(z.number().nullable()) }),
  ),
  wells: z
    .array(z.object({ id: z.string().min(1), name: z.string().min(1), x: z.number(), y: z.number(), totalDepth: z.number().positive() }))
    .optional(),
});

export type ValidationResult = { ok: true; dataset: GeoDataset } | { ok: false; errors: string[] };

const MAX_ERRORS = 8;

/** Schema + semantic validation. Never fills missing values: they are reported. */
export function validateDataset(input: unknown): ValidationResult {
  const parsed = UploadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.slice(0, MAX_ERRORS).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  const d = parsed.data;
  const errors: string[] = [];
  const N = d.grid.nx * d.grid.ny;

  if (d.surfaces.length !== d.formations.length + 1)
    errors.push(
      `Expected ${d.formations.length + 1} surfaces for ${d.formations.length} formations (terrain + one base per formation), got ${d.surfaces.length}.`,
    );
  const ids = new Set<string>();
  for (const f of d.formations) {
    if (ids.has(f.id)) errors.push(`Duplicate formation id "${f.id}".`);
    ids.add(f.id);
  }
  d.surfaces.forEach((s, k) => {
    if (s.z.length !== N) errors.push(`Surface "${s.name}" has ${s.z.length} samples; grid ${d.grid.nx}×${d.grid.ny} needs ${N}.`);
    const missing = s.z.findIndex((v) => v === null || !Number.isFinite(v));
    if (missing >= 0)
      errors.push(
        `Surface "${s.name}" is missing a sample at i=${missing % d.grid.nx}, j=${Math.floor(missing / d.grid.nx)} (index ${missing}).`,
      );
    void k;
  });
  if (errors.length) return { ok: false, errors: errors.slice(0, MAX_ERRORS) };

  for (let k = 1; k < d.surfaces.length; k++) {
    const above = d.surfaces[k - 1].z as number[];
    const cur = d.surfaces[k].z as number[];
    let bad = 0, first = -1;
    for (let p = 0; p < N; p++)
      if (cur[p] > above[p]) {
        bad++;
        if (first < 0) first = p;
      }
    if (bad)
      errors.push(
        `Invalid horizon order: "${d.surfaces[k].name}" is above "${d.surfaces[k - 1].name}" at ${bad} sample(s), first at i=${first % d.grid.nx}, j=${Math.floor(first / d.grid.nx)}.`,
      );
  }

  const ext = gridExtent(d.grid);
  for (const w of d.wells ?? [])
    if (w.x < ext.xMin || w.x > ext.xMax || w.y < ext.yMin || w.y > ext.yMax)
      errors.push(`Well "${w.id}" at (${w.x}, ${w.y}) lies outside the grid extent.`);

  if (errors.length) return { ok: false, errors: errors.slice(0, MAX_ERRORS) };

  return {
    ok: true,
    dataset: {
      id: "upload",
      name: d.name,
      description: d.description ?? "User-supplied dataset (kept in this browser only).",
      source: "upload",
      units: "m",
      grid: d.grid,
      formations: d.formations as Formation[],
      surfaces: d.surfaces.map((s) => ({ id: s.id, name: s.name, z: s.z as number[] })),
      wells: d.wells ?? [],
    },
  };
}

const PALETTE = ["#a08a6a", "#d2a35a", "#5f7a6e", "#a9b3b8", "#7a4b4b", "#8c7aa8", "#5b8aa6", "#b07d62"];

/**
 * CSV format: header `x,y,<surface_1>,…,<surface_n>` (top → bottom, ≥ 2 surfaces),
 * one row per grid node, on a regular grid. Formation k is named after surface k.
 */
export function parseCsvDataset(text: string, name = "Uploaded CSV"): ValidationResult {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (lines.length < 2) return { ok: false, errors: ["CSV has no data rows."] };
  const header = lines[0].split(",").map((h) => h.trim());
  const xi = header.findIndex((h) => h.toLowerCase() === "x");
  const yi = header.findIndex((h) => h.toLowerCase() === "y");
  const errors: string[] = [];
  if (xi < 0) errors.push('Missing required column "x".');
  if (yi < 0) errors.push('Missing required column "y".');
  const surfCols = header.map((h, i) => ({ h, i })).filter(({ i }) => i !== xi && i !== yi);
  if (surfCols.length < 2) errors.push("Need at least two surface columns after x and y (terrain plus one base).");
  if (errors.length) return { ok: false, errors };

  const rows: { x: number; y: number; v: (number | null)[] }[] = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = lines[r].split(",");
    if (cells.length !== header.length) {
      errors.push(`Row ${r + 1}: expected ${header.length} values, got ${cells.length}.`);
      continue;
    }
    const x = Number(cells[xi]);
    const y = Number(cells[yi]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || cells[xi].trim() === "" || cells[yi].trim() === "") {
      errors.push(`Row ${r + 1}: invalid coordinate (${cells[xi]}, ${cells[yi]}).`);
      continue;
    }
    rows.push({
      x, y,
      v: surfCols.map(({ i }) => (cells[i].trim() === "" || !Number.isFinite(Number(cells[i])) ? null : Number(cells[i]))),
    });
    if (errors.length >= MAX_ERRORS) break;
  }
  if (errors.length) return { ok: false, errors };

  const xs = [...new Set(rows.map((r) => r.x))].sort((a, b) => a - b);
  const ys = [...new Set(rows.map((r) => r.y))].sort((a, b) => a - b);
  if (xs.length < 2 || ys.length < 2) return { ok: false, errors: ["Grid needs at least 2 distinct x and y values."] };
  if (xs.length * ys.length !== rows.length)
    return {
      ok: false,
      errors: [`Inconsistent grid dimensions: ${xs.length} x-values × ${ys.length} y-values ≠ ${rows.length} rows (missing or duplicate nodes).`],
    };
  const regular = (v: number[]) => {
    const d = v[1] - v[0];
    return v.every((q, i) => i === 0 || Math.abs(q - v[i - 1] - d) < 1e-5 * Math.max(1, Math.abs(d)));
  };
  if (!regular(xs) || !regular(ys)) return { ok: false, errors: ["Unsupported structure: x/y spacing must be regular."] };

  const nx = xs.length, ny = ys.length;
  const xIdx = new Map(xs.map((v, i) => [v, i]));
  const yIdx = new Map(ys.map((v, i) => [v, i]));
  const zs = surfCols.map(() => new Array<number | null>(nx * ny).fill(null));
  for (const r of rows) {
    const p = yIdx.get(r.y)! * nx + xIdx.get(r.x)!;
    r.v.forEach((v, k) => (zs[k][p] = v));
  }

  return validateDataset({
    name,
    grid: { nx, ny, x0: xs[0], y0: ys[0], dx: xs[1] - xs[0], dy: ys[1] - ys[0] },
    formations: surfCols.slice(0, -1).map(({ h }, k) => ({
      id: `unit_${k + 1}`,
      name: `Unit ${k + 1} (below ${h})`,
      color: PALETTE[k % PALETTE.length],
    })),
    surfaces: surfCols.map(({ h }, k) => ({ id: h.replace(/\W+/g, "_") || `s${k}`, name: h, z: zs[k] })),
  });
}
