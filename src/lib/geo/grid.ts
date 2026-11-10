import type { GridSpec } from "./types";

export const gridIndex = (g: GridSpec, i: number, j: number) => j * g.nx + i;

export const gridX = (g: GridSpec, i: number) => g.x0 + i * g.dx;
export const gridY = (g: GridSpec, j: number) => g.y0 + j * g.dy;

export const gridExtent = (g: GridSpec) => ({
  xMin: g.x0,
  xMax: g.x0 + (g.nx - 1) * g.dx,
  yMin: g.y0,
  yMax: g.y0 + (g.ny - 1) * g.dy,
});

/** Bilinear interpolation of a gridded field at world (x, y). Points outside are clamped to the edge. */
export function sampleBilinear(g: GridSpec, z: ArrayLike<number>, x: number, y: number): number {
  const fx = Math.min(Math.max((x - g.x0) / g.dx, 0), g.nx - 1);
  const fy = Math.min(Math.max((y - g.y0) / g.dy, 0), g.ny - 1);
  const i = Math.min(Math.floor(fx), g.nx - 2);
  const j = Math.min(Math.floor(fy), g.ny - 2);
  const tx = fx - i;
  const ty = fy - j;
  const z00 = z[gridIndex(g, i, j)];
  const z10 = z[gridIndex(g, i + 1, j)];
  const z01 = z[gridIndex(g, i, j + 1)];
  const z11 = z[gridIndex(g, i + 1, j + 1)];
  return (z00 * (1 - tx) + z10 * tx) * (1 - ty) + (z01 * (1 - tx) + z11 * tx) * ty;
}

/** Trapezoidal-rule weight for node (i, j): 1 inside, 1/2 on edges, 1/4 at corners. */
export function trapezoidWeight(g: GridSpec, i: number, j: number) {
  const wx = i === 0 || i === g.nx - 1 ? 0.5 : 1;
  const wy = j === 0 || j === g.ny - 1 ? 0.5 : 1;
  return wx * wy;
}
