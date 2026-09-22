"""Builds storefront images for peel-and-stick wallpaper products.

    python3 tools/make-wallpaper-assets.py "<folder of pattern PNGs>"

For every pattern it writes public/assets/Wallpapers/<slug>/
  room.jpg     4:5 living-room mockup (card + first gallery slide)
  pattern.jpg  4:5 full-resolution pattern crop (zoomable)
  detail.jpg   1:1 close-up at print scale (zoomable)
Slugs/names come from WALLPAPERS below (keyed by source filename); run
tools/make-thumbs.py afterwards for the WebP thumbnails.
"""
import os, sys, random
from PIL import Image, ImageDraw, ImageFilter, ImageStat

WALLPAPERS = {
    'Blue Beige Striped Pattern Desktop Wallpaper.png': 'sage-sand-stripe',
    'Blue and White Illustrated Cats Desktop Wallpaper.png': 'cat-nap',
    'Pink Beige and Red Illustrated Floral Wallpaper.png': 'paisley-bloom',
    'Pink Red and White Minimalist Bows Desktop Wallpaper.png': 'little-bows',
    'Purple and Cream Illustrated Rabbits Desktop Wallpaper.png': 'bunny-meadow',
    'White Green and Pastel Illustrated Floral Desktop Wallpaper.png': 'wildflower-field',
}
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'assets', 'Wallpapers')
Image.MAX_IMAGE_PIXELS = None
W, H, SS = 1600, 2000, 2          # mockup size, supersampling factor
WALL_BOTTOM = 1470

def portrait_crop(im, ratio=4/5):
    w, h = im.size
    cw = int(h * ratio)
    x = (w - cw) // 2
    return im.crop((x, 0, x + cw, h))

def accent_colour(im):
    """most saturated common colour of the pattern — used for cushions"""
    small = im.convert('RGB').resize((120, 68)).quantize(8).convert('RGB')
    cols = sorted(small.getcolors(10000), reverse=True)
    def sat(c):
        r, g, b = c; mx, mn = max(c), min(c)
        return (mx - mn) / (mx + 1)
    best = max(cols[:6], key=lambda c: sat(c[1]) * (c[0] ** 0.3))[1]
    return best

def shade(c, k):
    return tuple(max(0, min(255, int(v * k))) for v in c)

def room(pattern, accent):
    s = SS
    # The designs don't repeat seamlessly, so rather than tiling, take one
    # centred crop tall enough to cover the wall above the skirting board.
    wh = WALL_BOTTOM * s
    k = wh / pattern.height
    cw = min(pattern.width, round(W * s / k))
    x0 = (pattern.width - cw) // 2
    wall = Image.new('RGB', (W * s, H * s), (200, 200, 200))
    wall.paste(pattern.convert('RGB').crop((x0, 0, x0 + cw, pattern.height)).resize((W * s, wh), Image.LANCZOS), (0, 0))
    base = wall.copy()
    d = ImageDraw.Draw(base)
    # floor: warm oak planks
    fy = WALL_BOTTOM * s
    d.rectangle([0, fy, W * s, H * s], fill=(196, 160, 118))
    rnd = random.Random(4)
    y = fy
    while y < H * s:
        ph = 70 * s
        d.line([0, y, W * s, y], fill=(176, 140, 100), width=2 * s)
        x = rnd.randint(0, 300) * s
        while x < W * s:
            d.line([x, y, x, y + ph], fill=(180, 145, 104), width=2 * s)
            x += rnd.randint(380, 620) * s
        y += ph
    # skirting board
    d.rectangle([0, fy - 34 * s, W * s, fy], fill=(246, 243, 236))
    d.line([0, fy - 34 * s, W * s, fy - 34 * s], fill=(222, 216, 204), width=3 * s)

    # soft light: darken wall corners/bottom, brighten upper middle
    light = Image.new('L', (W * s, H * s), 0)
    ld = ImageDraw.Draw(light)
    ld.ellipse([-W * s * 0.3, -H * s * 0.35, W * s * 1.3, H * s * 0.95], fill=255)
    light = light.filter(ImageFilter.GaussianBlur(160 * s))
    dark = Image.new('RGB', base.size, (40, 32, 26))
    base = Image.composite(base, Image.blend(base, dark, 0.28), light)
    d = ImageDraw.Draw(base)

    def sh(box, blur=26, alpha=110):
        m = Image.new('L', base.size, 0)
        ImageDraw.Draw(m).ellipse([v * s for v in box], fill=alpha)
        m = m.filter(ImageFilter.GaussianBlur(blur * s))
        return m
    black = Image.new('RGB', base.size, (30, 24, 20))
    # contact shadows first
    for box in [(180, 1520, 1240, 1600), (1290, 1540, 1480, 1575), (40, 1520, 250, 1565)]:
        base = Image.composite(black, base, sh(box))
    d = ImageDraw.Draw(base)

    sofa, sofa_dk = (221, 213, 201), (198, 189, 176)
    # sofa back, seat, arms, legs
    R = lambda box, r, col: d.rounded_rectangle([v * s for v in box], radius=r * s, fill=col)
    R((250, 1110, 1170, 1380), 46, sofa_dk)
    R((300, 1135, 700, 1330), 40, sofa)
    R((720, 1135, 1120, 1330), 40, sofa)
    R((230, 1300, 1190, 1470), 30, sofa)
    R((220, 1300, 1190, 1350), 24, shade(sofa, 1.04))
    R((190, 1210, 320, 1480), 40, sofa_dk)
    R((1100, 1210, 1230, 1480), 40, sofa_dk)
    for x in (260, 1140):
        R((x, 1470, x + 26, 1530), 6, (92, 70, 52))
    # cushions in the pattern's accent colour
    for (x0, y0, x1, y1), k in [((360, 1170, 560, 1330), 1.0), ((840, 1170, 1040, 1330), 0.9)]:
        R((x0, y0, x1, y1), 34, shade(accent, k))
        R((x0 + 10, y0 + 10, x1 - 10, y0 + 40), 14, shade(accent, k * 1.12))
    # throw blanket
    d.polygon([(v[0] * s, v[1] * s) for v in [(930, 1300), (1100, 1300), (1120, 1470), (960, 1470)]], fill=(245, 241, 232))

    # floor lamp
    d.rectangle([1382 * s, 820 * s, 1392 * s, 1555 * s], fill=(60, 52, 46))
    d.ellipse([1320 * s, 1545 * s, 1455 * s, 1575 * s], fill=(60, 52, 46))
    d.polygon([(1310 * s, 960 * s), (1465 * s, 960 * s), (1430 * s, 800 * s), (1345 * s, 800 * s)], fill=(250, 244, 230))
    glow = Image.new('L', base.size, 0)
    ImageDraw.Draw(glow).ellipse([1180 * s, 700 * s, 1600 * s, 1150 * s], fill=90)
    glow = glow.filter(ImageFilter.GaussianBlur(120 * s))
    base = Image.composite(Image.new('RGB', base.size, (255, 236, 200)), base, glow)
    d = ImageDraw.Draw(base)

    # plant in a pot
    leaf = (74, 122, 86)
    for ang, (cx, cy, rx, ry) in enumerate([(120, 1260, 44, 110), (70, 1300, 40, 96), (175, 1300, 40, 96), (95, 1200, 36, 90), (150, 1195, 36, 90), (125, 1150, 30, 80)]):
        lay = Image.new('L', base.size, 0)
        ImageDraw.Draw(lay).ellipse([(cx - rx) * s, (cy - ry) * s, (cx + rx) * s, (cy + ry) * s], fill=255)
        lay = lay.rotate((ang - 2.5) * 12, center=(cx * s, (cy + ry) * s))
        base = Image.composite(Image.new('RGB', base.size, shade(leaf, 0.9 + 0.05 * (ang % 3))), base, lay)
    d = ImageDraw.Draw(base)
    d.polygon([(70 * s, 1360 * s), (180 * s, 1360 * s), (165 * s, 1545 * s), (85 * s, 1545 * s)], fill=(214, 120, 84))
    d.rectangle([64 * s, 1350 * s, 186 * s, 1380 * s], fill=(226, 134, 98))

    return base.resize((W, H), Image.LANCZOS)

def main(src_dir):
    for fname, slug in WALLPAPERS.items():
        p = os.path.join(src_dir, fname)
        if not os.path.exists(p):
            print('missing', fname); continue
        out = os.path.join(ROOT, slug); os.makedirs(out, exist_ok=True)
        im = Image.open(p).convert('RGB')
        portrait_crop(im).resize((2000, 2500), Image.LANCZOS).save(os.path.join(out, 'pattern.jpg'), quality=88, optimize=True, progressive=True)
        w, h = im.size; c = min(w, h) // 2
        im.crop((w // 2 - c // 2, h // 2 - c // 2, w // 2 + c // 2, h // 2 + c // 2)).resize((1600, 1600), Image.LANCZOS) \
          .save(os.path.join(out, 'detail.jpg'), quality=88, optimize=True, progressive=True)
        room(im, accent_colour(im)).save(os.path.join(out, 'room.jpg'), quality=86, optimize=True, progressive=True)
        print('ok', slug)

if __name__ == '__main__':
    main(sys.argv[1])
