"""Validate a GeoStrata .usda export with Pixar's OpenUSD Python bindings.

    pip install usd-core
    python scripts/validate_usda.py path/to/scene.usda

Checks: stage opens, Z-up, metersPerUnit == 1, default prim, and every Mesh has
in-range face indices and triangle-only faces.
"""
import sys
from pxr import Usd, UsdGeom

stage = Usd.Stage.Open(sys.argv[1])
assert UsdGeom.GetStageUpAxis(stage) == UsdGeom.Tokens.z, "upAxis must be Z"
assert UsdGeom.GetStageMetersPerUnit(stage) == 1.0, "metersPerUnit must be 1"
assert stage.GetDefaultPrim(), "missing defaultPrim"
meshes = 0
for prim in stage.Traverse():
    if prim.IsA(UsdGeom.Mesh):
        m = UsdGeom.Mesh(prim)
        pts = m.GetPointsAttr().Get()
        idx = m.GetFaceVertexIndicesAttr().Get()
        counts = m.GetFaceVertexCountsAttr().Get()
        assert all(c == 3 for c in counts), f"{prim.GetPath()}: non-triangle face"
        assert sum(counts) == len(idx), f"{prim.GetPath()}: count/index mismatch"
        assert max(idx) < len(pts), f"{prim.GetPath()}: index out of range"
        meshes += 1
        print(f"{prim.GetPath()}: {len(pts)} points, {len(counts)} triangles")
print(f"OK: {meshes} meshes")
