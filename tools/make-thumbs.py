import os, sys
from PIL import Image, ImageOps
Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
SRC_DIRS = ['assets/Tshirt designs','assets/Floral','assets/Mythological','assets/Pop Culture','assets/Travel','posters','uploads']
SIZES = [480, 1080]
exts = ('.jpg','.jpeg','.png','.webp')
done = skipped = 0
for d in SRC_DIRS:
    for dp, dn, fn in os.walk(os.path.join(ROOT, d)):
        for f in fn:
            if not f.lower().endswith(exts): continue
            src = os.path.join(dp, f)
            rel = os.path.relpath(src, ROOT)
            base = os.path.splitext(rel)[0]
            outs = [os.path.join(ROOT, 'img', f'w{s}', base + '.webp') for s in SIZES]
            if all(os.path.exists(o) and os.path.getmtime(o) >= os.path.getmtime(src) for o in outs):
                skipped += 1; continue
            try:
                im = Image.open(src); im = ImageOps.exif_transpose(im)
                im = im.convert('RGBA') if im.mode in ('P','LA') else im
                if im.mode == 'RGBA':
                    bg = Image.new('RGB', im.size, (255,255,255)); bg.paste(im, mask=im.split()[3]); im = bg
                else:
                    im = im.convert('RGB')
                for s, o in zip(SIZES, outs):
                    os.makedirs(os.path.dirname(o), exist_ok=True)
                    t = im.copy()
                    if t.width > s: t = t.resize((s, round(t.height * s / t.width)), Image.LANCZOS)
                    t.save(o, 'WEBP', quality=80, method=4)
                done += 1
            except Exception as e:
                print('ERR', rel, e, flush=True)
print('done', done, 'skipped', skipped, flush=True)
