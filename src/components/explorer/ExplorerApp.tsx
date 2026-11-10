import { lazy, Suspense, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TopBar } from "./TopBar";
import { LayerPanel, ViewControls } from "./LayerPanel";
import { Inspector } from "./Inspector";
import { BottomPanel } from "./BottomPanel";
import { useExplorer } from "@/lib/geo/store";

const Viewer = lazy(() => import("./Viewer"));

function LeftContent() {
  return (
    <div className="space-y-6 p-3">
      <LayerPanel />
      <ViewControls />
    </div>
  );
}

function ViewportOverlay() {
  const ds = useExplorer((s) => s.dataset);
  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1">
        <span className="eyebrow">{ds.name} · {ds.grid.nx}×{ds.grid.ny}</span>
      </div>
      <div className="pointer-events-none absolute bottom-2 left-3 right-3 flex flex-wrap items-end justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="hidden sm:inline">Drag: orbit · Right-drag / two fingers: pan · Scroll / pinch: zoom · Click: inspect</span>
        <span className="rounded border border-border bg-background/70 px-1.5 py-0.5 backdrop-blur-sm">
          {ds.source === "synthetic" ? "Synthetic demonstration data — not a real formation" : "User-uploaded data (local)"}
        </span>
      </div>
    </>
  );
}

export function ExplorerApp() {
  const [left, setLeft] = useState(false);
  const [right, setRight] = useState(false);
  const selection = useExplorer((s) => s.selection);
  // Below the xl breakpoint the inspector is a drawer: open it when something is picked.
  useEffect(() => {
    if (selection && window.matchMedia("(max-width: 1279px)").matches) setRight(true);
  }, [selection]);
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <TopBar onLeft={() => setLeft(true)} onRight={() => setRight(true)} />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[280px] shrink-0 border-r border-border bg-sidebar lg:block" aria-label="Layers and view controls">
          <ScrollArea className="h-full"><LeftContent /></ScrollArea>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="relative min-h-[260px] flex-1 bg-viewport">
            <Suspense
              fallback={
                <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-primary" /> Building meshes…
                </div>
              }
            >
              <Viewer />
            </Suspense>
            <ViewportOverlay />
          </main>
          <section className="border-t border-border bg-panel" aria-label="Analysis panels">
            <BottomPanel />
          </section>
        </div>
        <aside className="hidden w-[320px] shrink-0 border-l border-border bg-sidebar xl:block" aria-label="Inspector">
          <ScrollArea className="h-full"><div className="p-4"><Inspector /></div></ScrollArea>
        </aside>
      </div>

      <Sheet open={left} onOpenChange={setLeft}>
        <SheetContent side="left" className="w-[300px] overflow-y-auto bg-sidebar p-0">
          <SheetHeader className="px-3 pt-4"><SheetTitle>Layers & view</SheetTitle></SheetHeader>
          <LeftContent />
        </SheetContent>
      </Sheet>
      <Sheet open={right} onOpenChange={setRight}>
        <SheetContent side="right" className="w-[340px] overflow-y-auto bg-sidebar">
          <SheetHeader className="p-0"><SheetTitle className="sr-only">Inspector</SheetTitle></SheetHeader>
          <Inspector />
        </SheetContent>
      </Sheet>
    </div>
  );
}
