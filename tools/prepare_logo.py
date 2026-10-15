from pathlib import Path
from PIL import Image

src_dir = Path(r"C:\Users\xawdc\AppData\Roaming\Cursor\User\workspaceStorage\empty-window\images")
out_dir = Path(__file__).resolve().parents[1] / "assets"
out_dir.mkdir(parents=True, exist_ok=True)

src = next(p for p in src_dir.iterdir() if "b4d6ea72" in p.name and p.suffix.lower() == ".png")
img = Image.open(src).convert("RGBA")
pixels = img.load()
w, h = img.size

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        m = max(r, g, b)
        if m < 34:
            pixels[x, y] = (0, 0, 0, 0)
        elif m < 78:
            alpha = int((m - 34) / 44 * 255)
            pixels[x, y] = (r, g, b, min(a, alpha))

bbox = img.getbbox()
pad = 18
box = (
    max(0, bbox[0] - pad),
    max(0, bbox[1] - pad),
    min(w, bbox[2] + pad),
    min(h, bbox[3] + pad),
)
cropped = img.crop(box)
cropped.save(out_dir / "logo.png")

side = max(cropped.size)
icon = Image.new("RGBA", (side, side), (0, 0, 0, 0))
icon.paste(cropped, ((side - cropped.size[0]) // 2, (side - cropped.size[1]) // 2), cropped)
icon.resize((256, 256), Image.Resampling.LANCZOS).save(out_dir / "favicon.png")
print(f"source={src.name}")
print(f"logo={cropped.size}")
