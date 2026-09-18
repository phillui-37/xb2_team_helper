#!/usr/bin/env python3
"""Render XB2 app icons (PNG, SVG, ICO) into public/."""

from __future__ import annotations

import io
import struct
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
ICONS = PUBLIC / "icons"
FONT_PATH = Path("/usr/share/fonts/truetype/macos/Inter-Bold.ttf")

BG_TOP = (18, 52, 98)
BG_BOT = (8, 24, 48)
GOLD = (245, 197, 66)
GOLD_RGB = "#F5C542"
THEME = "#123462"
TEXT = "XB2"
MASTER = 1024


def lerp(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))  # type: ignore[return-value]


def gradient(size: int) -> Image.Image:
    img = Image.new("RGB", (size, size))
    pixels = img.load()
    last = max(size - 1, 1)
    for y in range(size):
        color = lerp(BG_TOP, BG_BOT, y / last)
        for x in range(size):
            pixels[x, y] = color
    return img.convert("RGBA")


def rounded_mask(size: int, radius: int) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def fit_font(inner: float) -> ImageFont.FreeTypeFont:
    lo, hi = 8, int(inner)
    best = ImageFont.truetype(str(FONT_PATH), 16)
    while lo <= hi:
        mid = (lo + hi) // 2
        font = ImageFont.truetype(str(FONT_PATH), mid)
        bbox = font.getbbox(TEXT)
        width = bbox[2] - bbox[0]
        if width <= inner * 0.92:
            best = font
            lo = mid + 1
        else:
            hi = mid - 1
    return best


def draw_text(img: Image.Image, pad_ratio: float) -> None:
    size = img.size[0]
    inner = size * (1 - 2 * pad_ratio)
    font = fit_font(inner)
    draw = ImageDraw.Draw(img)
    bbox = draw.textbbox((0, 0), TEXT, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] - size * 0.02
    shadow = max(1, size // 80)
    draw.text((x + shadow, y + shadow), TEXT, font=font, fill=(0, 0, 0, 140))
    stroke = max(0, size // 90)
    draw.text((x, y), TEXT, font=font, fill=GOLD, stroke_width=stroke, stroke_fill=GOLD)


def make_any(size: int) -> Image.Image:
    master = gradient(MASTER)
    radius = int(MASTER * 0.22)
    out = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
    out.paste(master, mask=rounded_mask(MASTER, radius))
    draw = ImageDraw.Draw(out)
    inset = max(2, MASTER // 48)
    width = max(4, MASTER // 36)
    draw.rounded_rectangle(
        (inset, inset, MASTER - 1 - inset, MASTER - 1 - inset),
        radius=max(1, radius - inset),
        outline=GOLD,
        width=width,
    )
    draw_text(out, pad_ratio=0.16)
    return out.resize((size, size), Image.Resampling.LANCZOS)


def make_maskable(size: int) -> Image.Image:
    out = gradient(MASTER)
    draw_text(out, pad_ratio=0.22)
    return out.resize((size, size), Image.Resampling.LANCZOS)


def write_ico(path: Path, images: list[Image.Image]) -> None:
    pngs: list[bytes] = []
    for image in images:
        buf = io.BytesIO()
        image.save(buf, format="PNG")
        pngs.append(buf.getvalue())
    offset = 6 + 16 * len(pngs)
    header = struct.pack("<HHH", 0, 1, len(pngs))
    entries = bytearray()
    for image, data in zip(images, pngs):
        width, height = image.size
        entries += struct.pack(
            "<BBBBHHII",
            width if width < 256 else 0,
            height if height < 256 else 0,
            0,
            0,
            1,
            32,
            len(data),
            offset,
        )
        offset += len(data)
    path.write_bytes(header + entries + b"".join(pngs))


def write_svg(path: Path) -> None:
    path.write_text(
        f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{THEME}"/>
      <stop offset="1" stop-color="#081830"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <rect x="14" y="14" width="484" height="484" rx="100" fill="none" stroke="{GOLD_RGB}" stroke-width="16"/>
  <text x="256" y="268" text-anchor="middle" dominant-baseline="middle"
        font-family="Inter, Arial, Helvetica, sans-serif" font-weight="700"
        font-size="210" fill="{GOLD_RGB}">XB2</text>
</svg>
''',
        encoding="utf-8",
    )


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    ICONS.mkdir(parents=True, exist_ok=True)

    any_512 = make_any(512)
    any_192 = make_any(192)
    apple = make_any(180)
    maskable = make_maskable(512)

    any_192.save(ICONS / "pwa-192x192.png", "PNG")
    any_512.save(ICONS / "pwa-512x512.png", "PNG")
    maskable.save(ICONS / "pwa-512x512-maskable.png", "PNG")
    apple.save(PUBLIC / "apple-touch-icon.png", "PNG")

    write_ico(PUBLIC / "favicon.ico", [make_any(size) for size in (16, 32, 48, 256)])
    write_svg(PUBLIC / "favicon.svg")
    print(f"Wrote icons under {PUBLIC}")


if __name__ == "__main__":
    main()
