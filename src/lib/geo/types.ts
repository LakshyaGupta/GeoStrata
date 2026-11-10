/**
 * Core data model for GeoStrata.
 *
 * Coordinate convention (world space):
 *   X = easting (m), Y = northing (m), Z = absolute elevation (m, positive up).
 * Depths (measured below a wellhead) are always stored separately and
 * converted explicitly: elevation = wellheadZ - depth.
 *
 * Surfaces are ordered top → bottom. surfaces[0] is the terrain and
 * surfaces[k + 1] is the base of formations[k]; so formations.length + 1
 * surfaces are required and formation k lies between surfaces[k] and surfaces[k + 1].
 */

export interface GridSpec {
  nx: number; // samples along X
  ny: number; // samples along Y
  x0: number; // easting of first sample (m)
  y0: number; // northing of first sample (m)
  dx: number; // spacing along X (m)
  dy: number; // spacing along Y (m)
}

export interface Formation {
  id: string;
  name: string;
  color: string; // #rrggbb
  description?: string;
}

export interface Surface {
  id: string;
  name: string;
  /** Row-major elevations: index = j * nx + i (j along Y, i along X). */
  z: number[];
}

export interface WellSpec {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Measured depth below wellhead (m). Vertical wells, so MD = TVD. */
  totalDepth: number;
}

export interface GeoDataset {
  id: string;
  name: string;
  description: string;
  source: "synthetic" | "upload";
  units: "m";
  grid: GridSpec;
  formations: Formation[];
  surfaces: Surface[];
  wells: WellSpec[];
  /** Generator parameters, so the dataset can be reproduced exactly. */
  parameters?: Record<string, number | string>;
}

export interface WellInterval {
  formationId: string;
  formationName: string;
  color: string;
  topDepth: number; // m below wellhead
  baseDepth: number;
  topZ: number; // elevation (m)
  baseZ: number;
}

export interface LogSample {
  depth: number; // m below wellhead
  z: number;
  formationId: string;
  gammaRay: number; // API units (synthetic)
  density: number; // g/cm³ (synthetic)
}

export interface DerivedWell extends WellSpec {
  wellheadZ: number;
  tdZ: number;
  intervals: WellInterval[];
  log: LogSample[];
}
