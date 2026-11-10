import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageShell, PIPELINE } from "@/components/site/SiteChrome";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture | GeoStrata" },
      { name: "description", content: "How GeoStrata turns gridded geological surfaces into validated, indexed 3D meshes, an interactive scene and OpenUSD exports." },
      { property: "og:title", content: "From Raw Geological Data to Interactive 3D Scenes" },
      { property: "og:description", content: "The real processing pipeline behind GeoStrata, module by module." },
    ],
  }),
  component: Architecture,
});

const DETAILS: [string, string][] = [
  ["Data formats", "In memory a dataset is { grid, formations[], surfaces[], wells[] }. surfaces[0] is terrain and surfaces[k+1] is the base of formations[k], so N formations need N+1 surfaces. Elevations are row-major (index = j·nx + i). Uploads accept the same JSON, or a CSV with x, y and one column per surface."],
  ["Input validation", "Zod checks types and bounds (grid ≤ 256×256, positive spacing, #rrggbb colours). Semantic checks follow: surface count, sample count per surface, null/NaN samples (reported with i, j — never filled), regular CSV spacing, horizon order at every node, wells inside the extent. Up to 8 errors are shown."],
  ["Coordinate systems", "World space is local Cartesian metres with Z up. Depth below a wellhead is stored separately and converted with z = wellheadZ − depth. The renderer wraps the world in one transform: translate to the model centre, scale by 1/1000 (km) with Z additionally scaled by the vertical exaggeration, then rotate −90° about X into three.js Y-up. Data is never rescaled in place."],
  ["Mesh construction", "Each surface becomes an indexed triangle grid: nx·ny vertices, 2(nx−1)(ny−1) triangles, wound CCW so normals face +Z. A formation block is its top surface, its base surface with flipped winding, and four side walls built along the CCW grid perimeter so they face outward. The block is topologically closed; wall vertices are duplicated rather than welded so walls shade flat."],
  ["Scene organisation", "GeoStrata › Formations › one mesh per formation; GeoStrata › Wells › one group per well with a cylinder per formation interval. Section plane and axes sit beside the model group so GLB export only contains geology."],
  ["Rendering", "MeshStandardMaterial per formation, hemisphere + two directional lights. Transparent layers disable depth writes and get an ordered renderOrder. Selection uses R3F raycasting and an emissive tint; hidden layers use visible=false so they are skipped by both the renderer and the raycaster."],
  ["Export", "JSON and CSV are direct serialisations. GLB uses three's GLTFExporter on the visible model group (so it includes the scene transform). USDA is written by hand: Z-up, metersPerUnit = 1, a Mesh per formation with points, faceVertexCounts, faceVertexIndices and constant displayColor, plus BasisCurves per well. The output was opened with Pixar's usd-core and checked by scripts/validate_usda.py."],
  ["Performance decisions", "Geometry is built once per (dataset, formation) in useMemo and disposed on change. Layer toggles and opacity only touch material/visibility props. Per-frame state never goes through React. Generation is synchronous: it is measured on each load and logged in the Event log; a Web Worker was not added because the measured cost at the offered resolutions did not justify it. The viewer is lazy-loaded and the explorer route is client-only."],
];

function Architecture() {
  return (
    <PageShell>
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="eyebrow">Architecture</div>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">From Raw Geological Data to Interactive 3D Scenes</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">Everything below runs in the browser in TypeScript. There is no backend service: domain logic lives in <code className="num text-foreground">src/lib/geo</code> with no React or three.js imports, and the viewer only draws its output.</p>

        <ol className="relative mt-14 grid gap-3 md:grid-cols-2" aria-label="Processing pipeline">
          {PIPELINE.map((p, i) => (
            <li key={p.title} className="panel relative p-5">
              <div className="flex items-baseline gap-3">
                <span className="num text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                <h2 className="font-medium">{p.title}</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              <div className="num mt-3 text-[11px] text-muted-foreground/80">{p.file}</div>
            </li>
          ))}
        </ol>

        <pre className="panel num mt-10 overflow-x-auto p-5 text-[12px] leading-relaxed text-muted-foreground">{`generateDataset() ─┐
                   ├─► GeoDataset ─► validateDataset() ─► store (zustand)
parseCsvDataset() ─┘                                        │
                                                            ├─► formationBlock() ─► BufferGeometry ─► <Viewer/>
                                                            ├─► deriveWell()     ─► wells, logs, inspector
                                                            ├─► crossSection()   ─► SVG section
                                                            ├─► formationStats() ─► analytics
                                                            └─► toJson / toCsv / toUsda / GLTFExporter`}</pre>

        <div className="prose-geo mt-6 max-w-3xl">
          {DETAILS.map(([h, b]) => (
            <section key={h}><h2>{h}</h2><p>{b}</p></section>
          ))}
          <h2>Not implemented</h2>
          <ul>
            <li>No server, database, auth or cloud storage. Uploads stay in memory in the tab.</li>
            <li>No Python service. The only Python is an offline USDA validation script.</li>
            <li>The site does not run NVIDIA Omniverse; exported .usda files can be opened by USD-compatible tools such as usdview or Omniverse.</li>
          </ul>
        </div>
        <div className="mt-12 flex gap-3">
          <Button asChild><Link to="/explorer">Open the explorer</Link></Button>
          <Button asChild variant="outline"><Link to="/docs">Read the docs</Link></Button>
        </div>
      </main>
    </PageShell>
  );
}
