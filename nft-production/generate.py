#!/usr/bin/env python3
"""Kryntar Divers — 2,222 production generator.
Variants of the 26 approved AI masters: seeded hue/brightness jitter, flip,
depth-theme colour grade + gradient, pixel bubbles & sparkles, rarity frame.
Deterministic seed: kryntar-2222-launch-v1
"""
import hashlib, io, json, os, random, sys
from PIL import Image, ImageDraw, ImageEnhance, ImageOps

SRC = os.path.expanduser("~/workspace/ts-spaces/kryntar/client/src/assets")
OUT = os.path.expanduser("~/workspace/projects/kryntar/nft-production")
IMG = os.path.join(OUT, "images"); META = os.path.join(OUT, "metadata")
os.makedirs(IMG, exist_ok=True); os.makedirs(META, exist_ok=True)
SEED = "kryntar-2222-launch-v1"
SIZE = 512

MASTERS = {
    # name: (file, rarity, max_depth)
    "Pink Scuba":    ("diver-lady.webp",        "Common",    300),
    "Baby Big Tank": ("diver-baby.webp",        "Common",    300),
    "Cat Diver":     ("diver-cat.webp",         "Common",    300),
    "Frog Diver":    ("diver-frog.webp",        "Common",    300),
    "Bee Diver":     ("diver-bee.webp",         "Common",    300),
    "Medic Diver":   ("diver-medic.webp",       "Common",    300),
    "Captain Brass": ("diver-captain.webp",     "Rare",      600),
    "Shark Hood":    ("diver-shark.webp",       "Rare",      600),
    "Miner Diver":   ("diver-miner.webp",       "Rare",      600),
    "Lantern Keeper":("diver-lantern.webp",     "Rare",      600),
    "Octo Friend":   ("diver-octo.webp",        "Rare",      600),
    "Pirate Diver":  ("diver-pirate.webp",      "Rare",      600),
    "Sub Captain":   ("diver-subcaptain.webp",  "Rare",      600),
    "Knight Diver":  ("diver-knight.webp",      "Rare",      600),
    "Unit K-7":      ("diver-robot.webp",       "Epic",      900),
    "Hollow Diver":  ("diver-skull.webp",       "Epic",      900),
    "Shadow Abyss":  ("diver-shadow.webp",      "Epic",      900),
    "Frost Diver":   ("diver-frost.webp",       "Epic",      900),
    "Viking Diver":  ("diver-viking.webp",      "Epic",      900),
    "Witch Diver":   ("diver-witch.webp",       "Epic",      900),
    "Samurai Diver": ("diver-samurai.webp",     "Epic",      900),
    "Vampire Diver": ("diver-vampire.webp",     "Epic",      900),
    "Crystal Diver": ("diver-crystal.webp",     "Legendary", 1200),
    "Royal Gold":    ("diver-royal.webp",       "Legendary", 1200),
    "Ember Crystal": ("diver-embercrystal.webp","Legendary", 1200),
    "Dragon Diver":  ("diver-dragon.webp",      "Legendary", 1200),
}
QUOTA = {"Common": 1111, "Rare": 667, "Epic": 333, "Legendary": 111}
THEMES = {  # name: (tint RGB, strength 0..1)
    "Surface Glow":  ((64, 120, 110), 0.10),
    "Shallow Teal":  ((30, 110, 120), 0.16),
    "Fracture Copper": ((150, 84, 32), 0.14),
    "Core Ember":    ((170, 70, 20),  0.16),
    "Heart Gold":    ((190, 140, 40), 0.15),
    "Abyss Violet":  ((70, 50, 130),  0.16),
    "Frost Pale":    ((120, 170, 200),0.13),
    "Shadow Deep":   ((16, 20, 34),   0.22),
}
FRAMES = {"Common": (138, 134, 126), "Rare": (201, 123, 45),
          "Epic": (159, 216, 232), "Legendary": (255, 201, 77)}
SPARKS = [(255, 138, 61), (255, 201, 77), (159, 216, 232), (232, 227, 216)]

# ---- build assignment: quota split across masters, shuffled over IDs 1..2222
by_rarity = {}
for name, (f, rar, md) in MASTERS.items():
    by_rarity.setdefault(rar, []).append(name)
slots = []
for rar, names in by_rarity.items():
    base, rem = divmod(QUOTA[rar], len(names))
    for i, n in enumerate(sorted(names)):
        slots += [n] * (base + (1 if i < rem else 0))
assert len(slots) == 2222, len(slots)
rng = random.Random(SEED); rng.shuffle(slots)

cache = {}
def master_img(fn):
    if fn not in cache:
        cache[fn] = Image.open(os.path.join(SRC, fn)).convert("RGB")
    return cache[fn]

def hue_shift(img, deg):
    hsv = img.convert("HSV")
    h, s, v = hsv.split()
    shift = int(deg * 255 / 360) % 256
    h = h.point(lambda x: (x + shift) % 256)
    return Image.merge("HSV", (h, s, v)).convert("RGB")

def variant(img, r, theme_name):
    tint, strength = THEMES[theme_name]
    im = img.resize((SIZE, SIZE), Image.LANCZOS)
    if r.random() < 0.5: im = ImageOps.mirror(im)
    im = hue_shift(im, r.choice([-18, -12, -6, 0, 0, 6, 12, 18]))
    im = ImageEnhance.Brightness(im).enhance(r.uniform(0.92, 1.08))
    im = ImageEnhance.Contrast(im).enhance(r.uniform(0.95, 1.08))
    im = ImageEnhance.Color(im).enhance(r.uniform(0.90, 1.15))
    # zoom-crop jitter
    z = r.uniform(1.0, 1.12)
    if z > 1.001:
        w = int(SIZE / z); x = r.randint(0, SIZE - w); y = r.randint(0, SIZE - w)
        im = im.crop((x, y, x + w, y + w)).resize((SIZE, SIZE), Image.LANCZOS)
    # theme tint + top-light/bottom-dark gradient
    overlay = Image.new("RGB", (SIZE, SIZE), tint)
    im = Image.blend(im, Image.blend(im, overlay, 0.55), strength)
    grad = Image.new("L", (1, SIZE))
    for yy in range(SIZE):
        grad.putpixel((0, yy), int(30 - 55 * (yy / SIZE)))  # +30 top .. -25 bottom
    im = Image.composite(ImageEnhance.Brightness(im).enhance(1.10), im, grad.resize((SIZE, SIZE)))
    d = ImageDraw.Draw(im, "RGBA")
    # pixel bubbles
    for _ in range(r.randint(4, 14)):
        bx, by = r.randint(8, SIZE - 8), r.randint(8, SIZE - 8)
        br = r.choice([2, 3, 4, 5])
        d.ellipse([bx - br, by - br, bx + br, by + br], outline=(220, 240, 245, 170), width=1)
        d.point((bx - 1, by - 1), fill=(255, 255, 255, 200))
    # 4-point sparkles
    for _ in range(r.randint(0, 6)):
        sx, sy = r.randint(12, SIZE - 12), r.randint(12, SIZE - 12)
        s = r.choice([4, 6, 8]); c = r.choice(SPARKS) + (210,)
        d.polygon([(sx, sy - s), (sx + 2, sy - 2), (sx + s, sy), (sx + 2, sy + 2),
                   (sx, sy + s), (sx - 2, sy + 2), (sx - s, sy), (sx - 2, sy - 2)], fill=c)
    return im

def add_frame(im, rar, r):
    fc = FRAMES[rar]; d = ImageDraw.Draw(im)
    w = 14 if rar == "Legendary" else 10
    for i in range(w):
        d.rectangle([i, i, SIZE - 1 - i, SIZE - 1 - i], outline=fc if i < w - 3 else (10, 10, 12))
    if rar == "Legendary":  # corner gems
        for cx, cy in [(w + 8, w + 8), (SIZE - w - 8, w + 8), (w + 8, SIZE - w - 8), (SIZE - w - 8, SIZE - w - 8)]:
            s = 7
            d.polygon([(cx, cy - s), (cx + s, cy), (cx, cy + s), (cx - s, cy)], fill=(255, 220, 120), outline=(255, 245, 200))
    elif rar == "Epic":
        for cx, cy in [(w + 4, w + 4), (SIZE - w - 4, w + 4), (w + 4, SIZE - w - 4), (SIZE - w - 4, SIZE - w - 4)]:
            d.rectangle([cx - 3, cy - 3, cx + 3, cy + 3], fill=(200, 240, 250))
    return im

rows, hashes = [], set()
for tid in range(1, 2223):
    name = slots[tid - 1]
    fn, rar, md = MASTERS[name]
    r = random.Random(f"{SEED}-{tid}")
    theme = r.choice(list(THEMES))
    im = add_frame(variant(master_img(fn), r, theme), rar, r)
    buf = io.BytesIO(); im.save(buf, "WEBP", quality=78)
    data = buf.getvalue()
    h = hashlib.sha256(data).hexdigest()
    assert h not in hashes, f"dup at {tid}"
    hashes.add(h)
    open(os.path.join(IMG, f"{tid}.webp"), "wb").write(data)
    meta = {"name": f"Kryntar Diver #{tid}", "description": "A Kryntar diver of the deep. Holders dive in Deep Dive: Legendary holders play without limit, Free holders 3 dives a day.",
            "image": f"https://kryntar.xyz/nft/images/{tid}.webp",
            "attributes": [{"trait_type": "Character", "value": name},
                           {"trait_type": "Rarity", "value": rar},
                           {"trait_type": "Max Depth", "value": f"{md} m"},
                           {"trait_type": "Depth Theme", "value": theme}]}
    json.dump(meta, open(os.path.join(META, f"{tid}.json"), "w"), indent=1)
    rows.append({"id": tid, "character": name, "rarity": rar, "max_depth_m": md, "theme": theme, "sha256": h})
    if tid % 250 == 0: print(f"{tid}/2222", flush=True)

json.dump(rows, open(os.path.join(OUT, "assignment.json"), "w"), indent=0)
commit = hashlib.sha256("|".join(f"{r['id']}:{r['character']}" for r in rows).encode()).hexdigest()
total = sum(os.path.getsize(os.path.join(IMG, f)) for f in os.listdir(IMG))
summary = {"total": len(rows), "unique_sha256": len(hashes), "commitment": commit,
           "images_bytes": total, "seed": SEED,
           "by_rarity": {k: sum(1 for r in rows if r["rarity"] == k) for k in QUOTA}}
json.dump(summary, open(os.path.join(OUT, "summary.json"), "w"), indent=1)
print(json.dumps(summary, indent=1))
