import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PageShell, PIPELINE, PORTFOLIO_URL, REPO_URL } from "@/components/site/SiteChrome";
import screenshot from "@/assets/explorer-screenshot.jpg";

export const Route = createFileRoute("/case-study")({
  head: () => ({
    meta: [
      { title: "Case Study | GeoStrata" },
      { name: "description", content: "Engineering geological data into interactive 3D visualization: geospatial processing, procedural mesh generation and OpenUSD-oriented workflows." },
      { property: "og:title", content: "Engineering Geological Data into Interactive 3D Visualization" },
      { property: "og:description", content: "An independent demonstration of geospatial processing, procedural mesh generation, and OpenUSD-oriented visualization workflows." },
      { property: "og:type", content: "article" },
    ],
  }),
  component: CaseStudy,
});

const CHALLENGES: [string, string][] = [
  ["Consistent coordinate systems", "Geology is Z-up in metres; three.js is Y-up in arbitrary units. Rather than convert data, the world stays Z-up and the scene applies one transform (centre → scale to km × vertical exaggeration → rotate −90° about X). Exports therefore stay in true metres, and exaggeration can change without rebuilding geometry."],
  ["Stable mesh generation", "Each cell becomes two triangles with a fixed corner order so every normal faces +Z. Base surfaces flip that order, and side walls are stitched along a counter-clockwise perimeter so they face outward. Unit tests assert the sign of every triangle normal."],
  ["Horizon ordering", "Randomised thickness fields can cross. The generator clamps each horizon to at least 2 m below the one above, and the validator rejects uploads where a surface rises above its parent, reporting the node index."],
  ["3D performance", "Geometries are memoised per dataset and formation and disposed on change. Visibility and opacity are material and visibility props, so toggling never rebuilds meshes. Generation time is measured and logged on every load rather than assumed."],
  ["Data validation", "Zod covers shape; a second pass covers meaning (sample counts, missing values, regular spacing, ordering, wells inside the grid). Missing values are always errors: substituting zeros would quietly invent geology."],
  ["Accurate inspection", "Well intersections, log tracks, thickness statistics and the cross-section all read the same surfaces through one bilinear sampler, so the inspector and 3D view cannot disagree."],
  ["Cross-section interpolation", "The A–B line is sampled at 240 points; each surface is bilinearly interpolated per point and drawn as filled polygons between adjacent horizons. The chart reports its own vertical exaggeration, which differs from the 3D view."],
];

function CaseStudy() {
  return (
    <PageShell>
      <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="eyebrow">Case study</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Engineering Geological Data into Interactive 3D Visualization</h1>
        <p className="mt-4 text-lg text-muted-foreground">An independent demonstration of geospatial processing, procedural mesh generation, and OpenUSD-oriented visualization workflows.</p>

        <img src={screenshot} alt="GeoStrata explorer interface" className="mt-10 w-full rounded-xl border border-border" width={2160} height={1350} />

        <div className="prose-geo">
          <h2>Overview</h2>
          <p>GeoStrata explores one technical question: how do you turn structured geological data into a 3D scene people can understand? It was inspired by my internship at Halliburton, where I worked on integrating subsurface data services with NVIDIA Omniverse, building Python transformation pipelines and representing terrain and horizons in OpenUSD. This project is a separate, public re-imagining written from scratch with synthetic data.</p>

          <h2>The problem</h2>
          <p>Geological information usually lives in grids, tables and logs. Without spatial context it is hard to see how thick a unit is, where it pinches out, how a fault displaces it, or which formations a well passes through. An interactive 3D view, paired with exact numbers, makes those relationships easy to see.</p>

          <h2>The solution</h2>
          <ul>
            <li>Validates gridded surfaces from a generator or a user file.</li>
            <li>Builds an indexed block mesh per formation, plus well geometry.</li>
            <li>Renders an interactive scene with picking, layer controls and camera presets.</li>
            <li>Supports inspection: wells, logs, statistics, and a drawable cross-section.</li>
            <li>Exports JSON, CSV, PNG, GLB and OpenUSD.</li>
          </ul>

          <h2>System architecture</h2>
          <ol className="not-prose mt-4 grid gap-2">
            {PIPELINE.map((p, i) => (
              <li key={p.title} className="panel flex gap-4 p-4">
                <span className="num text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                <div><div className="text-sm font-medium">{p.title}</div><div className="num mt-0.5 text-[11px] text-muted-foreground">{p.file}</div></div>
              </li>
            ))}
          </ol>
          <p className="mt-4">Details are on the <Link to="/architecture">architecture page</Link>.</p>

          <h2>My engineering contributions (this project)</h2>
          <ul>
            <li>A deterministic, documented synthetic generator with three structural scenarios.</li>
            <li>A framework-free geometry and analysis library (<code>src/lib/geo</code>): grid sampling, block meshes, well intersection, cross-sections, statistics.</li>
            <li>Two-stage validation for JSON and CSV uploads with precise, user-facing errors.</li>
            <li>The React Three Fiber viewer, inspector, cross-section tool and analytics panels.</li>
            <li>A hand-written USDA serializer, validated with Pixar's usd-core.</li>
            <li>Unit tests for generation, mesh winding, interpolation, volumes, validation, CSV round-trip and USD output.</li>
          </ul>
          <p>Kept separate: my Halliburton work involved production data services and Omniverse integration. None of that code, data or design is reproduced here.</p>

          <h2>Technical challenges</h2>
          {CHALLENGES.map(([h, b]) => (<section key={h}><h3>{h}</h3><p>{b}</p></section>))}

          <h2>Results</h2>
          <ul>
            <li>Three synthetic datasets at four resolutions, switchable live, with every panel recomputing.</li>
            <li>Formation picking, solo/hide/opacity, wireframe, grid, axes, four camera presets and well focus.</li>
            <li>Drawable cross-sections with hover read-outs of elevation and per-unit thickness.</li>
            <li>JSON/CSV upload with validation; JSON, CSV, PNG, GLB and USDA export.</li>
          </ul>
          <p>No performance numbers are claimed. Generation time is shown live in the explorer's Event log on your machine.</p>

          <h2>What I learned</h2>
          <ul>
            <li>Keeping one coordinate frame and pushing every conversion to a single, explicit boundary removes a whole class of bugs.</li>
            <li>Separating geometry from rendering made the riskiest code (winding, ordering, interpolation) testable without a GPU.</li>
            <li>Validation is a UX feature: precise errors are what make an upload tool trustworthy.</li>
            <li>Writing USD by hand shows how close a clean scene graph is to an interchange format.</li>
          </ul>

          <h2>Technologies</h2>
          <p>React · TypeScript · Three.js · React Three Fiber · Geospatial data processing · 3D mesh generation · OpenUSD concepts</p>

          <h2>Contact</h2>
          <p>More of my work is on my <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer">portfolio</a>.{REPO_URL && <> Source: <a href={REPO_URL}>GitHub</a>.</>}</p>
        </div>
        <div className="mt-10 flex gap-3">
          <Button asChild><Link to="/explorer">Try the explorer</Link></Button>
          <Button asChild variant="outline"><a href={PORTFOLIO_URL} target="_blank" rel="noreferrer">Portfolio ↗</a></Button>
        </div>
      </main>
    </PageShell>
  );
}
