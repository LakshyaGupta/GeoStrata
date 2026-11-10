import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";

export const PORTFOLIO_URL = "https://laksh-gupta.vercel.app/";
/** Set once the public repository exists; links are hidden while null. */
export const REPO_URL: string | null = null;

const NAV = [
  { to: "/explorer", label: "Explorer" },
  { to: "/architecture", label: "Architecture" },
  { to: "/case-study", label: "Case study" },
  { to: "/docs", label: "Docs" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <Logo className="size-5 text-primary" />
          <span className="font-semibold tracking-tight">GeoStrata</span>
        </Link>
        <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className="transition-colors hover:text-foreground" activeProps={{ className: "text-foreground" }}>{n.label}</Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex"><Link to="/explorer">Launch 3D Explorer</Link></Button>
          <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}><Menu className="size-5" /></Button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-border px-4 py-3 md:hidden" aria-label="Mobile">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="block py-2.5 text-sm">{n.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="flex items-center gap-2 text-foreground"><Logo className="size-4 text-primary" /> GeoStrata</div>
          <p className="mt-2 max-w-md text-xs">
            Independent portfolio project by Laksh Gupta. Not affiliated with or endorsed by Halliburton or NVIDIA. All bundled datasets are synthetic.
          </p>
        </div>
        <div className="flex flex-wrap gap-5">
          <Link to="/docs" className="hover:text-foreground">Docs</Link>
          <Link to="/architecture" className="hover:text-foreground">Architecture</Link>
          <a href={PORTFOLIO_URL} className="hover:text-foreground" target="_blank" rel="noreferrer">Portfolio ↗</a>
          {REPO_URL && <a href={REPO_URL} className="hover:text-foreground" target="_blank" rel="noreferrer">GitHub ↗</a>}
        </div>
      </div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

/** Pipeline stages, each pointing at the module that implements it. */
export const PIPELINE = [
  { title: "Synthetic generator / upload", file: "lib/geo/generate.ts · validate.ts", body: "Seeded sinusoid fields build terrain + 5 horizons on a regular grid; or a JSON/CSV file is parsed in the browser." },
  { title: "Schema & semantic validation", file: "lib/geo/validate.ts", body: "Zod schema, sample counts, missing values, regular spacing, top→bottom horizon order, wells inside extent." },
  { title: "Coordinate frame", file: "lib/geo/grid.ts", body: "Local Cartesian metres. X east, Y north, Z elevation. Rendering scale (1 unit = 1 km) and vertical exaggeration are applied only at the scene transform." },
  { title: "Surface sampling", file: "lib/geo/grid.ts · derive.ts", body: "Bilinear interpolation for wells and cross-sections; trapezoidal integration for volumes." },
  { title: "Mesh generation", file: "lib/geo/mesh.ts", body: "Indexed triangle grids with CCW winding, flipped bases and outward side walls, one block per formation." },
  { title: "Scene graph", file: "components/explorer/Viewer.tsx", body: "Z-up world group rotated into three.js Y-up. Formations, wells, section plane and axes as separate nodes." },
  { title: "Interactive viewer", file: "React Three Fiber + drei", body: "Raycast picking, per-layer visibility and opacity, camera presets, wireframe, inspector and cross-section." },
  { title: "Export", file: "lib/geo/export.ts", body: "JSON, CSV, PNG, GLB (three.js GLTFExporter) and USDA validated with Pixar's usd-core." },
] as const;
