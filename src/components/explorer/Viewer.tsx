import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { datasetSummary, deriveWell } from "@/lib/geo/derive";
import { gridExtent } from "@/lib/geo/grid";
import { formationBlock } from "@/lib/geo/mesh";
import { useExplorer, viewerHandles } from "@/lib/geo/store";
import type { GeoDataset } from "@/lib/geo/types";

/** Render scale: 1 render unit = 1 km. Vertical exaggeration is applied on top of this. */
const S = 1 / 1000;

// three.js needs concrete colours; these mirror the CSS design tokens.
const SCENE = {
  bg: { navy: "#0f1520", black: "#07090d", slate: "#1c2431" },
  accent: "#5ad1ec",
  axis: "#8796ab",
  grid: "#2a3546",
  gridCenter: "#3a4a60",
  select: "#5ad1ec",
};

function useFrame0(ds: GeoDataset) {
  return useMemo(() => {
    const e = gridExtent(ds.grid);
    const s = datasetSummary(ds);
    return { ...e, cx: (e.xMin + e.xMax) / 2, cy: (e.yMin + e.yMax) / 2, cz: (s.zMin + s.zMax) / 2, zMin: s.zMin, zMax: s.zMax };
  }, [ds]);
}

function FormationMesh({ ds, k }: { ds: GeoDataset; k: number }) {
  const f = ds.formations[k];
  const layer = useExplorer((s) => s.layers[f.id]);
  const wireframe = useExplorer((s) => s.wireframe);
  const selected = useExplorer((s) => s.selection?.kind === "formation" && s.selection.id === f.id);
  const select = useExplorer((s) => s.select);
  const [hover, setHover] = useState(false);

  const geometry = useMemo(() => {
    const m = formationBlock(ds, k);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(m.positions, 3));
    g.setIndex(new THREE.BufferAttribute(m.indices, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }, [ds, k]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const opacity = layer?.opacity ?? 1;
  const transparent = opacity < 0.999;
  return (
    <mesh
      geometry={geometry}
      visible={layer?.visible ?? true}
      name={f.name}
      renderOrder={transparent ? 1 + k : 0}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        select({ kind: "formation", id: f.id });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "";
      }}
    >
      <meshStandardMaterial
        color={f.color}
        roughness={0.85}
        metalness={0.02}
        transparent={transparent}
        opacity={opacity}
        depthWrite={!transparent}
        side={THREE.DoubleSide}
        wireframe={wireframe}
        flatShading={false}
        emissive={selected ? SCENE.select : hover ? f.color : "#000000"}
        emissiveIntensity={selected ? 0.28 : hover ? 0.12 : 0}
        polygonOffset
        polygonOffsetFactor={k}
      />
    </mesh>
  );
}

function Wells({ ds }: { ds: GeoDataset }) {
  const show = useExplorer((s) => s.showWells);
  const sel = useExplorer((s) => (s.selection?.kind === "well" ? s.selection.id : null));
  const select = useExplorer((s) => s.select);
  const vex = useExplorer((s) => s.verticalExaggeration);
  const wells = useMemo(() => ds.wells.map((_, i) => deriveWell(ds, i, 25)), [ds]);
  if (!show) return null;
  const R = 22;
  return (
    <group name="Wells">
      {wells.map((w) => {
        const active = sel === w.id;
        const r = active ? R * 1.7 : R;
        const onClick = (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          select({ kind: "well", id: w.id });
        };
        return (
          <group key={w.id} name={w.id}>
            {w.intervals.map((iv) => (
              <mesh
                key={iv.formationId}
                position={[w.x, w.y, (iv.topZ + iv.baseZ) / 2]}
                rotation-x={Math.PI / 2}
                onClick={onClick}
              >
                <cylinderGeometry args={[r, r, iv.topZ - iv.baseZ, 10]} />
                <meshStandardMaterial color={iv.color} emissive={active ? SCENE.select : "#000"} emissiveIntensity={active ? 0.5 : 0} roughness={0.4} />
              </mesh>
            ))}
            <mesh position={[w.x, w.y, w.wellheadZ + 30 / vex]} rotation-x={Math.PI / 2} onClick={onClick}>
              <cylinderGeometry args={[r * 2.6, r * 2.6, 60 / vex, 20]} />
              <meshStandardMaterial color={active ? SCENE.select : "#e7edf5"} roughness={0.3} />
            </mesh>
            <Html position={[w.x, w.y, w.wellheadZ + 160 / vex]} center zIndexRange={[20, 0]}>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  select({ kind: "well", id: w.id });
                }}
                className={`num whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] backdrop-blur-sm transition-colors ${
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/70 text-foreground hover:border-primary"
                }`}
              >
                {w.id}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

function SectionPlane({ ds, zMin, zMax }: { ds: GeoDataset; zMin: number; zMax: number }) {
  const show = useExplorer((s) => s.showSection);
  const line = useExplorer((s) => s.section);
  const geometry = useMemo(() => {
    const z0 = zMin - 20, z1 = zMax + 60;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([line.ax, line.ay, z0, line.bx, line.by, z0, line.bx, line.by, z1, line.ax, line.ay, z1]), 3),
    );
    g.setIndex([0, 1, 2, 0, 2, 3]);
    return g;
  }, [line, zMin, zMax]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  if (!show) return null;
  const z1 = zMax + 60;
  return (
    <group>
      <mesh geometry={geometry} renderOrder={20} raycast={() => null}>
        <meshBasicMaterial color={SCENE.accent} transparent opacity={0.12} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Line points={[[line.ax, line.ay, z1], [line.bx, line.by, z1]]} color={SCENE.accent} lineWidth={2} />
      {(["A", "B"] as const).map((l) => (
        <Html key={l} position={l === "A" ? [line.ax, line.ay, z1] : [line.bx, line.by, z1]} center zIndexRange={[20, 0]}>
          <span className="num rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">{l}</span>
        </Html>
      ))}
      {void ds}
    </group>
  );
}

function Axes({ f }: { f: ReturnType<typeof useFrame0> }) {
  const show = useExplorer((s) => s.showAxes);
  if (!show) return null;
  const o: [number, number, number] = [f.xMin, f.yMin, f.zMin];
  const label = "num whitespace-nowrap text-[10px] text-muted-foreground";
  const ticks: { p: [number, number, number]; t: string }[] = [];
  for (let x = Math.ceil(f.xMin / 1000) * 1000; x <= f.xMax; x += 1000) ticks.push({ p: [x, f.yMin - 120, f.zMin], t: `${x}` });
  for (let y = Math.ceil(f.yMin / 1000) * 1000; y <= f.yMax; y += 1000) if (y > f.yMin) ticks.push({ p: [f.xMin - 120, y, f.zMin], t: `${y}` });
  return (
    <group>
      <Line points={[o, [f.xMax + 200, f.yMin, f.zMin]]} color="#e06c6c" lineWidth={1.5} />
      <Line points={[o, [f.xMin, f.yMax + 200, f.zMin]]} color="#6ccf8e" lineWidth={1.5} />
      <Line points={[o, [f.xMin, f.yMin, f.zMax + 100]]} color="#6ca8e0" lineWidth={1.5} />
      <Html position={[f.xMax + 350, f.yMin, f.zMin]} center><span className={label}>X · Easting (m)</span></Html>
      <Html position={[f.xMin, f.yMax + 350, f.zMin]} center><span className={label}>Y · Northing (m)</span></Html>
      <Html position={[f.xMin, f.yMin, f.zMax + 200]} center><span className={label}>Z · Elev. {Math.round(f.zMin)}–{Math.round(f.zMax)} m</span></Html>
      {ticks.map((t) => (
        <Html key={t.p.join()} position={t.p} center><span className="num text-[9px] text-muted-foreground/70">{t.t}</span></Html>
      ))}
    </group>
  );
}

function CameraRig({ f, ds }: { f: ReturnType<typeof useFrame0>; ds: GeoDataset }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update: () => void } | null };
  const cam = useExplorer((s) => s.camera);
  const vex = useExplorer((s) => s.verticalExaggeration);
  useEffect(() => {
    if (!controls) return;
    const r = (Math.hypot(f.xMax - f.xMin, f.yMax - f.yMin) * S) / 2;
    const target = new THREE.Vector3(0, 0, 0);
    let pos: THREE.Vector3;
    if (cam.focusWell) {
      const i = ds.wells.findIndex((w) => w.id === cam.focusWell);
      if (i >= 0) {
        const w = deriveWell(ds, i, 100);
        target.set((w.x - f.cx) * S, ((w.wellheadZ + w.tdZ) / 2 - f.cz) * S * vex, -(w.y - f.cy) * S);
      }
      pos = target.clone().add(new THREE.Vector3(r * 0.6, r * 0.45, r * 0.8));
    } else if (cam.preset === "top") pos = new THREE.Vector3(0, r * 2.4, 0.0001);
    else if (cam.preset === "front") pos = new THREE.Vector3(0, 0.2, r * 2.4);
    else if (cam.preset === "side") pos = new THREE.Vector3(r * 2.4, 0.2, 0);
    else pos = new THREE.Vector3(r * 1.25, r * 0.95, r * 1.45);
    camera.position.copy(pos);
    camera.near = 0.01;
    camera.far = r * 40;
    camera.updateProjectionMatrix();
    controls.target.copy(target);
    controls.update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cam.nonce, controls, ds]);
  return null;
}

function Handles({ model }: { model: React.RefObject<THREE.Group | null> }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    viewerHandles.screenshot = () => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    };
    viewerHandles.exportGlb = async () => {
      if (!model.current) throw new Error("Model not ready");
      const exp = new GLTFExporter();
      const out = await exp.parseAsync(model.current, { binary: true, onlyVisible: true });
      return out as ArrayBuffer;
    };
    return () => {
      viewerHandles.screenshot = undefined;
      viewerHandles.exportGlb = undefined;
    };
  }, [gl, scene, camera, model]);
  return null;
}

function Scene() {
  const ds = useExplorer((s) => s.dataset);
  const vex = useExplorer((s) => s.verticalExaggeration);
  const showGrid = useExplorer((s) => s.showGrid);
  const f = useFrame0(ds);
  const model = useRef<THREE.Group>(null);
  const gridY = (f.zMin - f.cz) * S * vex - 0.02;
  return (
    <>
      <hemisphereLight args={["#dfe9f5", "#3a3026", 0.9]} />
      <directionalLight position={[4, 6, 3]} intensity={1.6} />
      <directionalLight position={[-5, 2, -4]} intensity={0.35} color="#9fc4e8" />
      {showGrid && <gridHelper args={[10, 20, SCENE.gridCenter, SCENE.grid]} position={[0, gridY, 0]} />}
      <group rotation-x={-Math.PI / 2}>
        <group scale={[S, S, S * vex]}>
          <group position={[-f.cx, -f.cy, -f.cz]}>
            <group ref={model} name="GeoStrata">
              <group name="Formations">
                {ds.formations.map((fm, k) => (
                  <FormationMesh key={`${fm.id}`} ds={ds} k={k} />
                ))}
              </group>
              <Wells ds={ds} />
            </group>
            <SectionPlane ds={ds} zMin={f.zMin} zMax={f.zMax} />
            <Axes f={f} />
          </group>
        </group>
      </group>
      <CameraRig f={f} ds={ds} />
      <Handles model={model} />
    </>
  );
}

export default function Viewer() {
  const bg = useExplorer((s) => s.background);
  const select = useExplorer((s) => s.select);
  const [ready, setReady] = useState(false);
  return (
    <div className="absolute inset-0" data-scene-ready={ready ? "true" : undefined} aria-label="Interactive 3D geological model. Drag to orbit, scroll to zoom, right-drag to pan.">
      <Canvas
        dpr={[1, 2]}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ fov: 38, position: [4, 3, 4.5], near: 0.01, far: 200 }}
        onPointerMissed={() => select(null)}
        onCreated={() => requestAnimationFrame(() => setReady(true))}
      >
        <color attach="background" args={[SCENE.bg[bg]]} />
        <Scene />
        <OrbitControls makeDefault enableDamping dampingFactor={0.12} maxPolarAngle={Math.PI * 0.98} minDistance={0.5} maxDistance={30} />
      </Canvas>
    </div>
  );
}
