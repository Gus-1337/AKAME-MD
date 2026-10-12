#!/usr/bin/env python3
"""Generate animated assets for AKAME-MD README: animated banner + small flower."""
import math
import random
from PIL import Image, ImageDraw, ImageFilter

random.seed(1337)

# ----------------------------------------------------------------------------
# 1) ANIMATED BANNER: slow ping-pong zoom + falling red rose petals
# ----------------------------------------------------------------------------
SRC = "/home/user/AKAME-MD/img/akame-banner.png"
OUT = "/home/user/AKAME-MD/img/banner-anim.webp"

base = Image.open(SRC).convert("RGB")
W = 960
H = round(base.height * W / base.width)
base = base.resize((W, H), Image.LANCZOS)

FRAMES = 28
ZOOM = 0.045

petals = []
for _ in range(26):
    petals.append({
        "x": random.uniform(0, W),
        "y": random.uniform(0, H),
        "speed": random.uniform(0.35, 0.9),   # screen-heights per loop
        "sway": random.uniform(15, 45),
        "phase": random.uniform(0, 1),
        "size": random.uniform(0.7, 1.5),
        "spin": random.uniform(-360, 360),
        "rot0": random.uniform(0, 360),
        "tone": random.choice([(200, 25, 60), (225, 40, 80), (255, 80, 110), (160, 15, 45)]),
        "alpha": random.randint(150, 235),
    })

def petal_tile(size, tone, alpha):
    w, h = int(18 * size), int(9 * size)
    t = Image.new("RGBA", (max(w, 4) * 2, max(h, 4) * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(t)
    d.ellipse([2, 2, t.width - 2, t.height - 2], fill=tone + (alpha,))
    return t

tiles = {}
for p in petals:
    key = (p["size"], p["tone"], p["alpha"])
    if key not in tiles:
        tiles[key] = petal_tile(p["size"], p["tone"], p["alpha"])

frames = []
for i in range(FRAMES):
    u = i / FRAMES
    # seamless ping-pong zoom
    z = 1 + ZOOM * (0.5 - 0.5 * math.cos(2 * math.pi * u))
    cw, ch = W / z, H / z
    left, top = (W - cw) / 2, (H - ch) / 2
    frame = base.crop((round(left), round(top), round(left + cw), round(top + ch))).resize((W, H), Image.LANCZOS).convert("RGBA")

    for p in petals:
        y = (p["y"] + p["speed"] * H * u) % (H + 80) - 40
        x = p["x"] + p["sway"] * math.sin(2 * math.pi * (u + p["phase"]))
        rot = p["rot0"] + p["spin"] * u
        tile = tiles[(p["size"], p["tone"], p["alpha"])].rotate(rot, expand=True, resample=Image.BICUBIC)
        frame.alpha_composite(tile, dest=(int(x - tile.width / 2), int(y - tile.height / 2)))

    frames.append(frame.convert("RGB").convert("P", palette=Image.ADAPTIVE, colors=128))

frames[0].save(OUT, save_all=True, append_images=frames[1:], duration=90, loop=0,
               quality=72, method=6)
print("banner-anim.webp:", round(__import__("os").path.getsize(OUT) / 1024), "KB")

# ----------------------------------------------------------------------------
# 2) SMALL FLOWER: cute rose that gently sways, glowing pulse + sparkles
# ----------------------------------------------------------------------------
OUT2 = "/home/user/AKAME-MD/img/flower.webp"
S = 4                      # supersample
CW, CH = 150, 190          # final canvas
cw, ch = CW * S, CH * S
pivot = (cw // 2, int(ch * 0.96))

def rose_layer():
    """Upright rose + stem on transparent canvas (supersampled)."""
    im = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    hx, hy = cw // 2, int(ch * 0.34)          # head center
    stem_w = 7 * S

    # stem (slightly curved)
    pts = []
    for t in [k / 40 for k in range(41)]:
        x = hx + 10 * S * math.sin(t * math.pi) * 0.4
        y = hy + 40 * S + t * (ch - hy - 45 * S)
        pts.append((x, y))
    d.line(pts, fill=(30, 110, 55, 255), width=stem_w, joint="curve")

    # leaves
    for sx, rot in ((-1, 25), (1, -25)):
        leaf = Image.new("RGBA", (int(46 * S), int(22 * S)), (0, 0, 0, 0))
        ld = ImageDraw.Draw(leaf)
        ld.ellipse([0, 0, leaf.width, leaf.height], fill=(42, 150, 70, 255))
        ld.line([4, leaf.height // 2, leaf.width - 4, leaf.height // 2], fill=(24, 110, 50, 255), width=2 * S)
        leaf = leaf.rotate(rot, expand=True, resample=Image.BICUBIC)
        lx = hx + sx * (16 * S) - leaf.width // 2 + sx * 14 * S
        ly = int(ch * 0.62) - leaf.height // 2
        im.alpha_composite(leaf, dest=(lx, ly))

    # petals: rotated ellipses in 3 rings + swirl core
    def petal_ring(count, dist, pw, ph, color, start=0, jitter=0):
        for k in range(count):
            ang = start + 360 * k / count
            p = Image.new("RGBA", (int(pw), int(ph)), (0, 0, 0, 0))
            pd = ImageDraw.Draw(p)
            pd.ellipse([0, 0, p.width - 1, p.height - 1], fill=color)
            p = p.rotate(ang + jitter, expand=True, resample=Image.BICUBIC)
            a = math.radians(ang - 90)
            px = hx + math.cos(a) * dist - p.width // 2
            py = hy + math.sin(a) * dist - p.height // 2
            im.alpha_composite(p, dest=(int(px), int(py)))

    R = S
    petal_ring(7, 34 * R, 42 * R, 26 * R, (130, 12, 38, 255), start=10)
    petal_ring(6, 24 * R, 34 * R, 22 * R, (185, 22, 58, 255), start=40)
    petal_ring(5, 15 * R, 26 * R, 17 * R, (225, 45, 85, 255), start=15)

    # swirl core
    for k in range(3):
        bb = [hx - (13 - k * 4) * R, hy - (11 - k * 3) * R, hx + (13 - k * 4) * R, hy + (11 - k * 3) * R]
        d.arc(bb, start=200 + k * 90, end=380 + k * 90, fill=(255, 120, 150, 255), width=3 * R)

    # calyx (green base under head)
    d.ellipse([hx - 14 * R, hy + 26 * R, hx + 14 * R, hy + 44 * R], fill=(36, 130, 60, 255))
    return im, (hx, hy)

flower_up, head_center = rose_layer()

def glow_sprite(r, color, alpha):
    g = Image.new("RGBA", (r * 2, r * 2), (0, 0, 0, 0))
    gd = ImageDraw.Draw(g)
    for rr in range(r, 0, -2):
        a = int(alpha * (1 - rr / r) ** 2)
        gd.ellipse([r - rr, r - rr, r + rr, r + rr], fill=color + (a,))
    return g

GLOW_R = int(70 * S)

FRAMES2 = 30
frames2 = []
for i in range(FRAMES2):
    u = i / FRAMES2
    sway = 9 * math.sin(2 * math.pi * u)          # degrees, seamless
    pulse = 0.5 + 0.5 * math.sin(2 * math.pi * u) # glow pulse

    glow = glow_sprite(GLOW_R, (255, 40, 90), int(70 + 60 * pulse))
    canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    canvas.alpha_composite(glow, dest=(head_center[0] - GLOW_R, head_center[1] - GLOW_R))

    rotated = flower_up.rotate(sway, center=pivot, resample=Image.BICUBIC)
    canvas.alpha_composite(rotated)

    # sparkles: two twinkles at fixed spots, brightness follows loop
    for (sx, sy, ph) in ((head_center[0] + 55 * S, head_center[1] - 45 * S, 0.0),
                         (head_center[0] - 60 * S, head_center[1] + 10 * S, 0.5)):
        tw = 0.5 + 0.5 * math.sin(2 * math.pi * (u + ph))
        if tw > 0.15:
            sr = int((4 + 5 * tw) * S)
            star = Image.new("RGBA", (sr * 2, sr * 2), (0, 0, 0, 0))
            sd = ImageDraw.Draw(star)
            a = int(230 * tw)
            sd.line([sr, 0, sr, sr * 2], fill=(255, 235, 245, a), width=max(2, S))
            sd.line([0, sr, sr * 2, sr], fill=(255, 235, 245, a), width=max(2, S))
            canvas.alpha_composite(star, dest=(sx - sr, sy - sr))

    small = canvas.resize((CW, CH), Image.LANCZOS)
    frames2.append(small)

frames2[0].save(OUT2, save_all=True, append_images=frames2[1:], duration=80, loop=0,
                lossless=True, method=6)
print("flower.webp:", round(__import__("os").path.getsize(OUT2) / 1024), "KB")
