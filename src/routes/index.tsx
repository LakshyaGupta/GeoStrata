import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell, PIPELINE, PORTFOLIO_URL, REPO_URL } from "@/components/site/SiteChrome";
import { SCENARIOS } from "@/lib/geo/generate";
import viewport from "@/assets/explorer-viewport.jpg";
import screenshot from "@/assets/explorer-screenshot.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GeoStrata | Interactive 3D Geological Visualization" },
      { name: "description", content: "Explore geological datasets through interactive 3D visualization, subsurface modeling, well inspection, and geospatial data processing." },
      { property: "og:title", content: "GeoStrata | Interactive 3D Geological Visualization" },
      { property: "og:description", content: "Transform geological data into interactive 3D subsurface visualizations." },
    ],
  }),
  component: Landing,
});

const CAPABILITIES = [
  ["Layered 3D formations", "Every formation is a closed block mesh built from the gridded surfaces. Toggle, solo and fade any layer."],
  ["Synthetic wells", "Vertical wells intersected with each horizon, with a synthetic gamma-ray and density log."],
  ["Cross-sections", "Draw an A–B line on the map; every surface is interpolated along it with labelled axes and exaggeration."],
  ["Validated uploads", "Bring a JSON or CSV grid. Missing samples, bad spacing and crossed horizons are reported, not hidden."],
  ["Real exports", "JSON, CSV, PNG, GLB and an OpenUSD .usda stage, checked with Pixar's usd-core."],
  ["Computed analytics", "Thickness, relief, trapezoidal volume estimates and triangle counts, all from the loaded data."],
];

const TECH = ["React 19", "TypeScript", "Three.js", "React Three Fiber", "drei", "Zod", "Zustand", "Recharts", "Vitest", "OpenUSD (USDA)"];

function Landing() {
  return (
    <PageShell>
      <main>
        <section className="glow-top relative overflow-hidden border-b border-border">
          <div className="blueprint pointer-events-none absolute inset-0 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" aria-hidden />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 sm:px-6 sm:pt-28">
            <div className="eyebrow">Subsurface data explorer · synthetic demonstration data</div>
            <h1 className="mt-4 max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">Explore What Lies Beneath.</h1>
            <p className="mt-5 max-w-2xl text-lg text-foreground/90">Transform geological data into interactive 3D subsurface visualizations.</p>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              GeoStrata is an interactive geological visualization platform demonstrating how spatial data can be processed, transformed into 3D geometry, and explored through a modern engineering interface.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link to="/explorer">Launch 3D Explorer <ArrowRight className="size-4" /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/architecture">Explore the Architecture</Link></Button>
            </div>
            <Link to="/explorer" className="group mt-14 block overflow-hidden rounded-xl border border-border bg-viewport shadow-2xl" aria-label="Open the 3D explorer">
              <img src={viewport} alt="GeoStrata explorer showing the Faulted Structure dataset: five layered formations offset by a fault, with wells and an A–B section line" className="w-full transition-transform duration-700 group-hover:scale-[1.01]" width={1260} height={732} />
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">Captured from the live explorer: Faulted Structure dataset, 64 × 51 grid, 2× vertical exaggeration.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="eyebrow">Pipeline</div>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight">Raw grid in, inspectable scene out.</h2>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((p, i) => (
              <li key={p.title} className="bg-panel p-5">
                <span className="num text-xs text-primary">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2 font-medium">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border bg-panel/50">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.3fr]">
            <div>
              <div className="eyebrow">Capabilities</div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Every panel is computed from the loaded dataset.</h2>
              <dl className="mt-8 space-y-5">
                {CAPABILITIES.map(([t, b]) => (
                  <div key={t}><dt className="font-medium">{t}</dt><dd className="mt-1 text-sm text-muted-foreground">{b}</dd></div>
                ))}
              </dl>
            </div>
            <div className="space-y-4">
              <img src={screenshot} alt="Full GeoStrata explorer interface with formation list, 3D viewport, cross-section panel and dataset inspector" className="w-full rounded-xl border border-border" loading="lazy" width={2160} height={1350} />
              <div className="grid gap-3 sm:grid-cols-3">
                {SCENARIOS.map((s) => (
                  <div key={s.id} className="panel p-4">
                    <div className="text-sm font-medium">{s.name}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{s.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 md:grid-cols-2">
          <div>
            <div className="eyebrow">Background</div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">Why I built it</h2>
            <p className="mt-4 text-muted-foreground">
              An independent geological visualization project inspired by my work integrating subsurface data with NVIDIA Omniverse and OpenUSD during a software engineering internship at Halliburton.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              No proprietary code, data or designs are used. Everything here is written from scratch and runs on synthetic data. The browser app does not run Omniverse; it exports USD that Omniverse-compatible tools can open.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline"><Link to="/case-study">Read the case study</Link></Button>
              <Button asChild variant="ghost"><a href={PORTFOLIO_URL} target="_blank" rel="noreferrer">Portfolio ↗</a></Button>
              {REPO_URL && <Button asChild variant="ghost"><a href={REPO_URL} target="_blank" rel="noreferrer">Source on GitHub ↗</a></Button>}
            </div>
          </div>
          <div>
            <div className="eyebrow">Built with</div>
            <ul className="mt-5 flex flex-wrap gap-2">
              {TECH.map((t) => <li key={t} className="num rounded-md border border-border bg-panel px-3 py-1.5 text-xs">{t}</li>)}
            </ul>
          </div>
        </section>
      </main>
    </PageShell>
  );
}
