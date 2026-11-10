import { create } from "zustand";
import { DEFAULT_RESOLUTION, generateDataset, type ScenarioId } from "./generate";
import type { SectionLine } from "./derive";
import type { GeoDataset } from "./types";
import { gridExtent } from "./grid";

export type Selection = { kind: "formation"; id: string } | { kind: "well"; id: string } | null;
export type CameraPreset = "perspective" | "top" | "front" | "side";

export interface LayerState {
  visible: boolean;
  opacity: number;
}

export interface LogEvent {
  t: number;
  level: "info" | "success" | "error";
  msg: string;
}

interface ExplorerState {
  scenario: ScenarioId | "upload";
  resolution: number;
  dataset: GeoDataset;
  uploaded: GeoDataset | null;
  layers: Record<string, LayerState>;
  selection: Selection;
  wireframe: boolean;
  showGrid: boolean;
  showAxes: boolean;
  showWells: boolean;
  showSection: boolean;
  verticalExaggeration: number;
  background: "navy" | "black" | "slate";
  section: SectionLine;
  camera: { preset: CameraPreset; nonce: number; focusWell?: string };
  events: LogEvent[];

  loadScenario: (id: ScenarioId, resolution?: number) => void;
  setResolution: (r: number) => void;
  loadUpload: (ds: GeoDataset) => void;
  setLayer: (id: string, patch: Partial<LayerState>) => void;
  soloLayer: (id: string) => void;
  showAllLayers: () => void;
  resetLayers: () => void;
  select: (s: Selection) => void;
  set: (patch: Partial<Pick<ExplorerState, "wireframe" | "showGrid" | "showAxes" | "showWells" | "showSection" | "verticalExaggeration" | "background">>) => void;
  setSection: (s: SectionLine) => void;
  setCamera: (preset: CameraPreset, focusWell?: string) => void;
  log: (level: LogEvent["level"], msg: string) => void;
}

const freshLayers = (ds: GeoDataset) =>
  Object.fromEntries(ds.formations.map((f) => [f.id, { visible: true, opacity: 1 }]));

export const defaultSection = (ds: GeoDataset): SectionLine => {
  const e = gridExtent(ds.grid);
  const ym = (e.yMin + e.yMax) / 2;
  return { ax: e.xMin, ay: ym, bx: e.xMax, by: ym };
};

function timed(id: ScenarioId, res: number) {
  const t0 = performance.now();
  const ds = generateDataset(id, res);
  return { ds, ms: performance.now() - t0 };
}

const initial = timed("layered-basin", DEFAULT_RESOLUTION);

export const useExplorer = create<ExplorerState>((set, get) => ({
  scenario: "layered-basin",
  resolution: DEFAULT_RESOLUTION,
  dataset: initial.ds,
  uploaded: null,
  layers: freshLayers(initial.ds),
  selection: null,
  wireframe: false,
  showGrid: true,
  showAxes: true,
  showWells: true,
  showSection: true,
  verticalExaggeration: 2,
  background: "navy",
  section: defaultSection(initial.ds),
  camera: { preset: "perspective", nonce: 0 },
  events: [
    { t: Date.now(), level: "info", msg: `Generated "${initial.ds.name}" at ${initial.ds.grid.nx}×${initial.ds.grid.ny} in ${initial.ms.toFixed(1)} ms` },
  ],

  loadScenario: (id, resolution) => {
    const res = resolution ?? get().resolution;
    const { ds, ms } = timed(id, res);
    set({ scenario: id, resolution: res, dataset: ds, layers: freshLayers(ds), selection: null, section: defaultSection(ds) });
    get().log("info", `Generated "${ds.name}" at ${ds.grid.nx}×${ds.grid.ny} in ${ms.toFixed(1)} ms`);
  },
  setResolution: (r) => {
    const s = get().scenario;
    if (s === "upload") return;
    get().loadScenario(s, r);
  },
  loadUpload: (ds) => {
    set({ scenario: "upload", uploaded: ds, dataset: ds, layers: freshLayers(ds), selection: null, section: defaultSection(ds) });
    get().log("success", `Loaded upload "${ds.name}" (${ds.grid.nx}×${ds.grid.ny}, ${ds.formations.length} formations)`);
  },
  setLayer: (id, patch) => set((s) => ({ layers: { ...s.layers, [id]: { ...s.layers[id], ...patch } } })),
  soloLayer: (id) =>
    set((s) => ({ layers: Object.fromEntries(Object.entries(s.layers).map(([k, v]) => [k, { ...v, visible: k === id }])) })),
  showAllLayers: () =>
    set((s) => ({ layers: Object.fromEntries(Object.entries(s.layers).map(([k, v]) => [k, { ...v, visible: true }])) })),
  resetLayers: () => set((s) => ({ layers: freshLayers(s.dataset) })),
  select: (selection) => set({ selection }),
  set: (patch) => set(patch),
  setSection: (section) => set({ section }),
  setCamera: (preset, focusWell) => set((s) => ({ camera: { preset, nonce: s.camera.nonce + 1, focusWell } })),
  log: (level, msg) => set((s) => ({ events: [{ t: Date.now(), level, msg }, ...s.events].slice(0, 100) })),
}));

/** Imperative handles registered by the viewer (screenshot, GLB export). */
export const viewerHandles: {
  screenshot?: () => string | null;
  exportGlb?: () => Promise<ArrayBuffer>;
} = {};
