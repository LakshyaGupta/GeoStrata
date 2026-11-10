import { createFileRoute } from "@tanstack/react-router";
import { ExplorerApp } from "@/components/explorer/ExplorerApp";

export const Route = createFileRoute("/explorer")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "3D Explorer | GeoStrata" },
      { name: "description", content: "Interactive 3D subsurface explorer: toggle formations, inspect synthetic wells, draw cross-sections and export JSON, CSV, GLB or OpenUSD." },
      { property: "og:title", content: "3D Explorer | GeoStrata" },
      { property: "og:description", content: "Rotate, slice and inspect a layered synthetic subsurface model in the browser." },
    ],
  }),
  pendingComponent: () => (
    <div className="flex h-dvh items-center justify-center text-sm text-muted-foreground">Loading explorer…</div>
  ),
  component: ExplorerApp,
});
