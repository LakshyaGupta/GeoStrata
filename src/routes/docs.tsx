import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/site/SiteChrome";
import { SCENARIOS, EXTENT_X, EXTENT_Y, MIN_THICKNESS, FAULT_THROW, RESOLUTIONS } from "@/lib/geo/generate";
import { MAX_GRID } from "@/lib/geo/validate";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation | GeoStrata" },
      { name: "description", content: "GeoStrata input formats, synthetic dataset parameters, controls, export formats and known limitations." },
      { property: "og:title", content: "GeoStrata Documentation" },
      { property: "og:description", content: "Supported inputs, controls, exports and limitations of the GeoStrata explorer." },
    ],
  }),
  component: Docs,
});

const SECTIONS = ["Overview", "Coordinate system", "Synthetic datasets", "JSON format", "CSV format", "Controls", "Exports", "Limitations"];
const id = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

function Docs() {
  return (
    <PageShell>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block" aria-label="Docs sections">
          <ul className="sticky top-24 space-y-2 text-sm text-muted-foreground">
            {SECTIONS.map((s) => <li key={s}><a href={`#${id(s)}`} className="hover:text-foreground">{s}</a></li>)}
          </ul>
        </nav>
        <main className="prose-geo min-w-0 max-w-3xl">
          <div className="eyebrow">Documentation</div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">Using GeoStrata</h1>

          <h2 id="overview">Overview</h2>
          <p>GeoStrata loads a gridded set of geological surfaces, validates it, turns every formation into a 3D block mesh and lets you inspect it. All processing happens in your browser.</p>

          <h2 id="coordinate-system">Coordinate system</h2>
          <ul>
            <li><code>X</code> = easting, <code>Y</code> = northing, <code>Z</code> = absolute elevation. Units are metres.</li>
            <li>Well depths are measured depth below the wellhead; wells are vertical so MD = TVD. Elevation = wellhead elevation − depth.</li>
            <li>Vertical exaggeration is applied only when drawing. Numbers in panels and exports are never exaggerated.</li>
          </ul>

          <h2 id="synthetic-datasets">Synthetic datasets</h2>
          <p>Each scenario covers {EXTENT_X} × {EXTENT_Y} m at a selectable resolution ({RESOLUTIONS.join(", ")} samples along X). Fields are sums of seeded sinusoids (mulberry32 PRNG), so the same scenario and resolution always give the same numbers. After generation, every horizon is clamped to sit at least {MIN_THICKNESS} m below the one above. These data do not represent any real place.</p>
          <ul>
            {SCENARIOS.map((s) => <li key={s.id}><strong className="text-foreground">{s.name}</strong> (seed {s.seed}) — {s.summary}</li>)}
          </ul>
          <p>Faulted Structure uses a fault trace <code>x = 2600 + 0.25·(y − 2000)</code> with {FAULT_THROW} m throw. Each scenario has five vertical wells drilled 120 m into basement. Their gamma-ray and density logs are a per-formation baseline plus seeded noise.</p>

          <h2 id="json-format">JSON format</h2>
          <pre>{`{
  "name": "My survey",
  "grid": { "nx": 3, "ny": 2, "x0": 0, "y0": 0, "dx": 100, "dy": 100 },
  "formations": [
    { "id": "sand", "name": "Sand", "color": "#d2a35a" }
  ],
  "surfaces": [                        // formations.length + 1, top → bottom
    { "id": "terrain", "name": "Terrain", "z": [410, 412, 415, 409, 411, 414] },
    { "id": "base",    "name": "Base",    "z": [300, 301, 303, 299, 300, 302] }
  ],
  "wells": [ { "id": "W1", "name": "W1", "x": 100, "y": 50, "totalDepth": 100 } ]
}`}</pre>
          <ul>
            <li><code>z</code> is row-major: index <code>j·nx + i</code>. Grid up to {MAX_GRID} × {MAX_GRID}.</li>
            <li>A <code>null</code> sample is reported as missing — never filled in.</li>
            <li>Every surface must be at or below the one above it at every node.</li>
          </ul>

          <h2 id="csv-format">CSV format</h2>
          <pre>{`x,y,terrain,top_shale,model_base
0,0,410.2,150.0,-600
100,0,412.0,149.1,-600
...`}</pre>
          <p>One row per grid node; x/y spacing must be regular. Columns after <code>x,y</code> are surfaces from top to bottom; formation k is named after surface k. Use the Example CSV and Example JSON buttons in the Upload dialog for complete files.</p>

          <h2 id="controls">Controls</h2>
          <ul>
            <li>Mouse: left-drag orbits, right-drag pans, scroll zooms. Touch: one finger orbits, two fingers pan/pinch.</li>
            <li>Click a formation or well to inspect it; click empty space to clear.</li>
            <li>Formation list: eye toggles visibility, <em>solo</em> shows one layer, slider sets opacity.</li>
            <li>Cross-section: click the map twice to set A and B, or use the W–E / S–N / SW–NE buttons.</li>
            <li>All panel buttons and sliders are keyboard reachable. Orbiting the 3D view needs a pointer; camera preset buttons are the keyboard alternative.</li>
          </ul>

          <h2 id="exports">Exports</h2>
          <ul>
            <li><strong className="text-foreground">JSON</strong> — the full dataset in the upload format (re-importable).</li>
            <li><strong className="text-foreground">CSV</strong> — x, y and every surface elevation per node (re-importable).</li>
            <li><strong className="text-foreground">GLB</strong> — visible formation and well meshes with the current scene transform (km units, Y up, current vertical exaggeration).</li>
            <li><strong className="text-foreground">USDA</strong> — visible formations as Mesh prims and wells as BasisCurves; Z up, metres, no exaggeration. Checked with Pixar usd-core via <code>scripts/validate_usda.py</code>.</li>
            <li><strong className="text-foreground">PNG</strong> — the current viewport.</li>
          </ul>

          <h2 id="limitations">Known limitations</h2>
          <ul>
            <li>Regular grids only; no scattered points, TINs or reprojection between real-world CRSs.</li>
            <li>Vertical wells only. Logs are synthetic.</li>
            <li>The fault is a displacement of grid values, not a modelled fault surface, so steep triangles span it.</li>
            <li>Volumes are geometric estimates of the gridded thickness.</li>
            <li>Uploads live only in memory and vanish on reload.</li>
            <li>Overlapping transparent layers can sort imperfectly, a usual limit of WebGL transparency.</li>
          </ul>
        </main>
      </div>
    </PageShell>
  );
}
