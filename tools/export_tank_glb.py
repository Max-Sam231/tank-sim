"""
Export t-72-outdated/source/072SHALL.blend → models/t72/tank.glb

  blender -b path/to/072SHALL.blend --python tools/export_tank_glb.py
"""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "models" / "t72" / "tank.glb"
MAX_TEX = 1024  # web-friendly; source textures are up to 8K


def downscale_images(max_size: int) -> int:
    changed = 0
    for img in bpy.data.images:
        if img.size[0] <= 0 or img.size[1] <= 0:
            continue
        w, h = img.size[0], img.size[1]
        if max(w, h) <= max_size:
            continue
        scale = max_size / float(max(w, h))
        nw = max(1, int(w * scale))
        nh = max(1, int(h * scale))
        try:
            img.scale(nw, nh)
            changed += 1
            print(f"[export_tank_glb] resized {img.name}: {w}x{h} → {nw}x{nh}")
        except Exception as exc:
            print(f"[export_tank_glb] skip resize {img.name}: {exc}")
    return changed


def main():
    OUT.parent.mkdir(parents=True, exist_ok=True)

    # Ensure meshes are visible/selectable
    for obj in bpy.data.objects:
        obj.hide_set(False)
        obj.hide_render = False
        obj.hide_viewport = False

    n = downscale_images(MAX_TEX)
    print(f"[export_tank_glb] downscaled {n} images (max {MAX_TEX}px)")

    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_materials="EXPORT",
        export_image_format="JPEG",
        export_jpeg_quality=80,
        export_yup=True,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
    )
    size_mb = OUT.stat().st_size / (1024 * 1024)
    print(f"[export_tank_glb] wrote {OUT} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
