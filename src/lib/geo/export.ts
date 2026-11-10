import { gridIndex, gridX, gridY } from "./grid";
import { deriveWell } from "./derive";
import { formationBlock } from "./mesh";
import type { GeoDataset } from "./types";

export function toJson(ds: GeoDataset): string {
  const { id: _id, source: _s, ...rest } = ds;
  return JSON.stringify(rest, null, 2);
}

/** One row per grid node: x, y, then each surface elevation (m). */
export function toCsv(ds: GeoDataset): string {
  const g = ds.grid;
  const out = [["x", "y", ...ds.surfaces.map((s) => s.id)].join(",")];
  for (let j = 0; j < g.ny; j++)
    for (let i = 0; i < g.nx; i++) {
      const p = gridIndex(g, i, j);
      out.push([round(gridX(g, i)), round(gridY(g, j)), ...ds.surfaces.map((s) => round(s.z[p]))].join(","));
    }
  return out.join("\n") + "\n";
}

const round = (v: number) => Math.round(v * 1000) / 1000;

/** Valid USD identifier: letters, digits, underscore; cannot start with a digit. */
export function usdName(s: string): string {
  const n = s.replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(n) ? n : `_${n}`;
}

const hexToRgb = (h: string) => {
  const v = parseInt(h.slice(1), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255].map((c) => c.toFixed(4));
};

const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(3).replace(/0+$/, "").replace(/\.$/, ""));

/**
 * USD ASCII (.usda) scene: Z-up, metersPerUnit = 1, one Mesh per formation block
 * under /GeoStrata/Formations and one linear BasisCurves per well under /GeoStrata/Wells.
 */
export function toUsda(ds: GeoDataset, visibleIds?: Set<string>): string {
  const L: string[] = [];
  L.push("#usda 1.0");
  L.push("(");
  L.push('    defaultPrim = "GeoStrata"');
  L.push("    metersPerUnit = 1");
  L.push('    upAxis = "Z"');
  L.push(`    doc = "GeoStrata export: ${ds.name.replace(/"/g, "'")}. ${ds.source === "synthetic" ? "Synthetic demonstration data." : "User-supplied data."}"`);
  L.push(")");
  L.push("");
  L.push('def Xform "GeoStrata" (');
  L.push('    kind = "assembly"');
  L.push(")");
  L.push("{");
  L.push('    def Scope "Formations"');
  L.push("    {");
  const used = new Set<string>();
  ds.formations.forEach((f, k) => {
    if (visibleIds && !visibleIds.has(f.id)) return;
    let name = usdName(f.name);
    while (used.has(name)) name += "_";
    used.add(name);
    const m = formationBlock(ds, k);
    const nTri = m.indices.length / 3;
    const pts: string[] = [];
    for (let p = 0; p < m.positions.length; p += 3)
      pts.push(`(${fmt(m.positions[p])}, ${fmt(m.positions[p + 1])}, ${fmt(m.positions[p + 2])})`);
    const [r, g, b] = hexToRgb(f.color);
    L.push(`        def Mesh "${name}"`);
    L.push("        {");
    L.push(`            int[] faceVertexCounts = [${new Array(nTri).fill(3).join(", ")}]`);
    L.push(`            int[] faceVertexIndices = [${Array.from(m.indices).join(", ")}]`);
    L.push(`            point3f[] points = [${pts.join(", ")}]`);
    L.push(`            color3f[] primvars:displayColor = [(${r}, ${g}, ${b})] (`);
    L.push('                interpolation = "constant"');
    L.push("            )");
    L.push('            uniform token orientation = "rightHanded"');
    L.push('            uniform token subdivisionScheme = "none"');
    L.push(`            custom string geostrata:formationId = "${f.id}"`);
    L.push("        }");
  });
  L.push("    }");
  L.push("");
  L.push('    def Scope "Wells"');
  L.push("    {");
  ds.wells.forEach((w, n) => {
    const d = deriveWell(ds, n, 50);
    L.push(`        def BasisCurves "${usdName(w.id)}"`);
    L.push("        {");
    L.push('            uniform token type = "linear"');
    L.push("            int[] curveVertexCounts = [2]");
    L.push(`            point3f[] points = [(${fmt(w.x)}, ${fmt(w.y)}, ${fmt(d.wellheadZ)}), (${fmt(w.x)}, ${fmt(w.y)}, ${fmt(d.tdZ)})]`);
    L.push("            float[] widths = [20] (");
    L.push('                interpolation = "constant"');
    L.push("            )");
    L.push(`            custom double geostrata:totalDepth = ${fmt(w.totalDepth)}`);
    L.push("        }");
  });
  L.push("    }");
  L.push("}");
  return L.join("\n") + "\n";
}

export function downloadBlob(data: BlobPart, filename: string, type: string) {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
