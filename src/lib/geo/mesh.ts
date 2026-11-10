import { gridIndex, gridX, gridY } from "./grid";
import type { GeoDataset, GridSpec } from "./types";

/**
 * Pure mesh construction (no three.js). Positions are world-space metres, Z up.
 * Triangle winding is counter-clockwise when viewed from the outward side.
 */
export interface MeshData {
  positions: Float32Array; // xyz triplets
  indices: Uint32Array; // triangle list
}

/** Indexed triangle grid for one surface. Two triangles per cell, normals pointing +Z (or −Z if flipped). */
export function surfaceMesh(g: GridSpec, z: ArrayLike<number>, flip = false): MeshData {
  const positions = new Float32Array(g.nx * g.ny * 3);
  for (let j = 0; j < g.ny; j++)
    for (let i = 0; i < g.nx; i++) {
      const p = gridIndex(g, i, j);
      positions[p * 3] = gridX(g, i);
      positions[p * 3 + 1] = gridY(g, j);
      positions[p * 3 + 2] = z[p];
    }
  const indices = new Uint32Array((g.nx - 1) * (g.ny - 1) * 6);
  let t = 0;
  for (let j = 0; j < g.ny - 1; j++)
    for (let i = 0; i < g.nx - 1; i++) {
      const a = gridIndex(g, i, j);
      const b = gridIndex(g, i + 1, j);
      const c = gridIndex(g, i, j + 1);
      const d = gridIndex(g, i + 1, j + 1);
      if (!flip) indices.set([a, b, c, b, d, c], t);
      else indices.set([a, c, b, b, c, d], t);
      t += 6;
    }
  return { positions, indices };
}

/** Grid perimeter as node indices, walked counter-clockwise seen from +Z. */
export function perimeter(g: GridSpec): number[] {
  const out: number[] = [];
  for (let i = 0; i < g.nx - 1; i++) out.push(gridIndex(g, i, 0));
  for (let j = 0; j < g.ny - 1; j++) out.push(gridIndex(g, g.nx - 1, j));
  for (let i = g.nx - 1; i > 0; i--) out.push(gridIndex(g, i, g.ny - 1));
  for (let j = g.ny - 1; j > 0; j--) out.push(gridIndex(g, 0, j));
  return out;
}

/**
 * Block mesh for formation k: top surface, flipped base surface and four side walls.
 * Topologically closed, but side-wall vertices are duplicated (not welded) so
 * walls get flat normals separate from the top/base.
 */
export function formationBlock(ds: GeoDataset, k: number): MeshData {
  const g = ds.grid;
  const top = surfaceMesh(g, ds.surfaces[k].z);
  const base = surfaceMesh(g, ds.surfaces[k + 1].z, true);
  const ring = perimeter(g);
  const nTop = g.nx * g.ny;

  const sidePos = new Float32Array(ring.length * 2 * 3);
  ring.forEach((p, r) => {
    const x = top.positions[p * 3];
    const y = top.positions[p * 3 + 1];
    sidePos.set([x, y, ds.surfaces[k].z[p]], r * 6);
    sidePos.set([x, y, ds.surfaces[k + 1].z[p]], r * 6 + 3);
  });
  const sideIdx = new Uint32Array(ring.length * 6);
  const off = nTop * 2;
  for (let r = 0; r < ring.length; r++) {
    const r2 = (r + 1) % ring.length;
    const t0 = off + r * 2, b0 = t0 + 1;
    const t1 = off + r2 * 2, b1 = t1 + 1;
    // Outward-facing for a CCW perimeter.
    sideIdx.set([b0, b1, t1, b0, t1, t0], r * 6);
  }

  const positions = new Float32Array(top.positions.length + base.positions.length + sidePos.length);
  positions.set(top.positions, 0);
  positions.set(base.positions, top.positions.length);
  positions.set(sidePos, top.positions.length * 2);
  const indices = new Uint32Array(top.indices.length + base.indices.length + sideIdx.length);
  indices.set(top.indices, 0);
  for (let n = 0; n < base.indices.length; n++) indices[top.indices.length + n] = base.indices[n] + nTop;
  indices.set(sideIdx, top.indices.length + base.indices.length);
  return { positions, indices };
}

export const triangleCount = (m: MeshData) => m.indices.length / 3;

/** Geometric normal of triangle t (unnormalised). */
export function triangleNormal(m: MeshData, t: number): [number, number, number] {
  const [a, b, c] = [m.indices[t * 3], m.indices[t * 3 + 1], m.indices[t * 3 + 2]];
  const P = m.positions;
  const ux = P[b * 3] - P[a * 3], uy = P[b * 3 + 1] - P[a * 3 + 1], uz = P[b * 3 + 2] - P[a * 3 + 2];
  const vx = P[c * 3] - P[a * 3], vy = P[c * 3 + 1] - P[a * 3 + 1], vz = P[c * 3 + 2] - P[a * 3 + 2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}
