#!/usr/bin/env python3
"""
AKAME-MD - Generador de banner animado
- Zoom/pan suave de la imagen (Ken Burns)
- Petalos rojos flotando + chispas ascendentes
- Flor pequena animada arriba (balanceo + latido de brillo)

Salida:
  img/akame-banner-animado.gif   (para README / WhatsApp)
  img/akame-banner-animado.png   (APNG alta calidad)
  img/flor-animada.png           (APNG de la flor sola, fondo transparente)
"""
import math
import os
import random
import sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops

ROOT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.join(ROOT, "akame-md")
SRC = os.path.join(REPO, "img", "akame-banner.png")
TMP = os.path.join(ROOT, ".cache", "akame_frames")
os.makedirs(TMP, exist_ok=True)

W, H = 1584, 672
N = 60                # frames
DELAY_MS = 40         # 25 fps
TAU = math.pi * 2

SS = 4                # supersampling para sprites

PALETTE = [
    (255, 38, 66),
    (255, 92, 120),
    (222, 22, 58),
    (255, 140, 165),
]


# ---------------------------------------------------------------- utilidades
def ease_loop(t):  # t en [0,1) -> suave 0..1..0
    return 0.5 - 0.5 * math.cos(TAU * t)


def petal_polygon(length, width, steps=42):
    """Petalo con punta en ambos extremos (estilo hoja)."""
    pts = []
    for i in range(steps + 1):
        t = i / steps
        half = (width / 2.0) * (math.sin(math.pi * t) ** 0.85)
        pts.append((t * length, -half))
    for i in range(steps, -1, -1):
        t = i / steps
        half = (width / 2.0) * (math.sin(math.pi * t) ** 0.85)
        pts.append((t * length, half))
    return pts


def _lerp3(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


_PETAL_SS_CACHE = {}


def _build_petal_ss(length, width, c_tip, c_mid, c_base):
    """Petalo tipo sakura en espacio supersample (base a la izquierda)."""
    key = (round(length), round(width), c_tip, c_mid, c_base)
    if key in _PETAL_SS_CACHE:
        return _PETAL_SS_CACHE[key]

    L = max(8, int(length))
    Wd = max(6, int(width))
    pad = 4 * SS
    cw, ch = L + pad * 2, Wd + 2 * pad

    mask = Image.new("L", (cw, ch), 0)
    md = ImageDraw.Draw(mask)
    steps = 110
    upper, lower = [], []
    for i in range(steps + 1):
        t = i / steps
        half = (Wd / 2.0) * (math.sin(math.pi * t) ** 0.6)
        base_x = t * t * 0.12  # base ligeramente estrecha
        x = pad + t * L + base_x * 0
        upper.append((x, pad + Wd / 2 - half))
        lower.append((x, pad + Wd / 2 + half))
    md.polygon(upper + lower[::-1], fill=255)
    nr = Wd * 0.16  # muesca sakura en la punta
    md.ellipse([pad + L - nr * 0.5, pad + Wd / 2 - nr,
                pad + L + nr * 1.7, pad + Wd / 2 + nr], fill=0)

    grad = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grad)
    for x in range(cw):
        t = min(1.0, max(0.0, (x - pad) / max(1, L)))
        col = _lerp3(c_base, c_mid, t / 0.5) if t < 0.5 else _lerp3(c_mid, c_tip, (t - 0.5) / 0.5)
        gd.line([(x, 0), (x, ch)], fill=col + (255,))

    mask = mask.filter(ImageFilter.GaussianBlur(SS * 0.35))
    grad.putalpha(mask)
    _PETAL_SS_CACHE[key] = grad
    return grad


def build_petal_sprite(length, width, c_tip, c_mid, c_base):
    """Petalo ya reducido a escala final (para petalos flotando)."""
    ss = _build_petal_ss(length * SS, width * SS, c_tip, c_mid, c_base)
    return ss.resize((ss.width // SS, ss.height // SS), Image.LANCZOS)


def make_petal_sprite(length, width, color, opacity=235):
    tint = tuple(min(255, int(c * 1.2) + 28) for c in color)
    base = tuple(max(0, int(c * 0.8)) for c in color)
    spr = build_petal_sprite(length, width, tint, color, base).copy()
    a = spr.split()[3].point(lambda v, k=opacity / 255: int(v * k))
    spr.putalpha(a)
    return spr


def make_flower(size, rot_deg, scale=1.0, glow=1.0):
    """Flor de cerezo de 5 petalos, todo en supersampling. RGBA rotada."""
    b = size * SS
    L = b * 0.80
    Wd = b * 0.60
    pad = 4 * SS
    inner, mid, outer = (255, 214, 230), (255, 84, 122), (204, 16, 58)
    petal = _build_petal_ss(L, Wd, inner, mid, outer)

    side = int(2 * (math.hypot(L, Wd) + pad + 8))
    cx = cy = side / 2.0
    flower = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    for i in range(5):
        ang = i * 72 - 90
        tile = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        # base del petalo exactamente en el centro del tile
        tile.alpha_composite(petal, (int(cx - pad), int(cy - petal.height / 2)))
        tile = tile.rotate(-ang, resample=Image.BICUBIC)
        flower.alpha_composite(tile)

    d = ImageDraw.Draw(flower)
    r = b * 0.15
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 224, 138, 255))
    r2 = b * 0.085
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=(255, 245, 208, 255))
    for i in range(7):
        a = math.radians(i * 51.4)
        px, py = cx + math.cos(a) * b * 0.112, cy + math.sin(a) * b * 0.112
        rr = b * 0.019
        d.ellipse([px - rr, py - rr, px + rr, py + rr], fill=(255, 196, 96, 235))

    if rot_deg:
        flower = flower.rotate(rot_deg, resample=Image.BICUBIC, expand=True)
    ds = max(8, int(round(side / SS)))
    flower = flower.resize((ds, ds), Image.LANCZOS)
    if scale != 1.0:
        s = max(8, int(flower.width * scale))
        flower = flower.resize((s, s), Image.LANCZOS)

    if glow > 0:
        nb = flower.filter(ImageFilter.GaussianBlur(max(2, flower.width * 0.05)))
        r_, g_, b_, a_ = nb.split()
        a_ = a_.point(lambda v: int(v * 0.5 * glow))
        nb = Image.merge("RGBA", (r_, g_, b_, a_))
        out = Image.new("RGBA", (flower.width + 40, flower.height + 40), (0, 0, 0, 0))
        out.alpha_composite(nb, (20, 20))
        out.alpha_composite(flower, (20, 20))
        flower = out
    return flower


def make_ember(size, color, alpha):
    s = max(2, int(size))
    img = Image.new("RGBA", (s * 4, s * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([s * 2 - s, s * 2 - s, s * 2 + s, s * 2 + s], fill=color + (alpha,))
    img = img.filter(ImageFilter.GaussianBlur(s * 0.6))
    return img


# ---------------------------------------------------------------- escena
def build_particles(seed=7):
    rnd = random.Random(seed)
    petals = []
    for _ in range(22):
        petals.append({
            "x0": rnd.uniform(-60, W + 60),
            "y0": rnd.uniform(40, H - 30),
            "ax": rnd.uniform(40, 120) * (1 if rnd.random() < 0.5 else 1),
            "ay": rnd.uniform(14, 40),
            "phase": rnd.uniform(0, TAU),
            "freq": rnd.choice([1, 1, 2]),
            "size": rnd.uniform(16, 40),
            "rot0": rnd.uniform(0, 360),
            "rot_speed": rnd.uniform(-90, 90),
            "color": rnd.choice(PALETTE),
            "op": rnd.randint(150, 225),
        })
    embers = []
    for _ in range(34):
        embers.append({
            "x0": rnd.uniform(0, W),
            "y0": rnd.uniform(30, H),
            "rise": rnd.uniform(18, 55),
            "phase": rnd.uniform(0, TAU),
            "freq": rnd.choice([1, 2]),
            "size": rnd.choice([1, 1.4, 2.0, 2.6]),
            "op": rnd.randint(90, 190),
        })
    return petals, embers


def main():
    base = Image.open(SRC).convert("RGB")
    if base.size != (W, H):
        base = base.resize((W, H), Image.LANCZOS)

    petals, embers = build_particles()

    # caches de sprites
    petal_cache = {}
    for p in petals:
        key = (round(p["size"]), p["color"])
        if key not in petal_cache:
            petal_cache[key] = make_petal_sprite(p["size"], p["size"] * 0.55, p["color"])
    ember_cache = {}
    for e in embers:
        if e["size"] not in ember_cache:
            ember_cache[e["size"]] = make_ember(e["size"], (255, 96, 110), 255)

    FLOWER_X, FLOWER_Y = int(W * 0.50), int(H * 0.115)   # arriba, centro-izquierda del halo
    FLOWER_SIZE = 74
    flower_cache = {}
    n_ang = 24
    for k in range(n_ang):
        t = k / n_ang
        ang = 14.0 * math.sin(TAU * t)
        sc = 1.0 + 0.05 * math.sin(TAU * t + 1.1)
        gl = 0.75 + 0.25 * math.sin(TAU * t * 2)
        flower_cache[k] = make_flower(FLOWER_SIZE, ang, sc, gl)

    frames = []
    for f in range(N):
        t = f / N

        # ---- fondo: zoom + pan suave ----
        z = 1.0 + 0.035 * ease_loop(t)
        bw, bh = int(W * z), int(H * z)
        bg = base.resize((bw, bh), Image.LANCZOS)
        pan_x = int(10 * math.sin(TAU * t))
        pan_y = int(4 * math.sin(TAU * t + 0.7))
        left = (bw - W) // 2 + pan_x
        top = (bh - H) // 2 + pan_y
        left = max(0, min(bw - W, left))
        top = max(0, min(bh - H, top))
        frame = bg.crop((left, top, left + W, top + H)).convert("RGBA")

        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))

        # ---- chispas subiendo ----
        for e in embers:
            y = e["y0"] - e["rise"] * (0.5 - 0.5 * math.cos(TAU * (t * e["freq"]) + e["phase"]))
            x = e["x0"] + 12 * math.sin(TAU * t + e["phase"])
            tw = 0.45 + 0.55 * (0.5 + 0.5 * math.sin(TAU * 3 * t + e["phase"] * 2))
            sp = ember_cache[e["size"]].copy()
            a = sp.split()[3].point(lambda v, k=tw * e["op"] / 255: int(v * k))
            sp.putalpha(a)
            overlay.alpha_composite(sp, (int(x - sp.width / 2), int(y - sp.height / 2)))

        # ---- petalos flotando ----
        for p in petals:
            x = p["x0"] + p["ax"] * math.sin(TAU * t * p["freq"] + p["phase"])
            y = p["y0"] + p["ay"] * ease_loop((t * p["freq"] + p["phase"] / TAU) % 1.0)
            if not (-80 < x < W + 80):
                continue
            spr = petal_cache[(round(p["size"]), p["color"])]
            ang = p["rot0"] + p["rot_speed"] * t
            sp = spr.rotate(ang % 360, resample=Image.BICUBIC, expand=True)
            fade = 0.75 + 0.25 * math.sin(TAU * t + p["phase"])
            a = sp.split()[3].point(lambda v, k=fade * p["op"] / 255: int(v * k))
            sp.putalpha(a)
            overlay.alpha_composite(sp, (int(x - sp.width / 2), int(y - sp.height / 2)))

        # ---- pequeño fogonazo de luz tras el brillo de la espada ----
        # (se mantiene sutil para no recargar)

        frame.alpha_composite(overlay)

        # ---- flor arriba ----
        k = int(round((t % 1.0) * n_ang)) % n_ang
        fl = flower_cache[k]
        bob = 5 * math.sin(TAU * t)
        swayx = 6 * math.sin(TAU * t + 0.6)
        frame.alpha_composite(fl, (int(FLOWER_X - fl.width / 2 + swayx),
                                   int(FLOWER_Y - fl.height / 2 + bob)))

        frames.append(frame)
        if f % 10 == 0:
            print(f"frame {f}/{N}", flush=True)

    # ---- guardar PNGs (para ImageMagick y APNG) ----
    for f, fr in enumerate(frames):
        fr.convert("RGB").save(os.path.join(TMP, f"f{f:03d}.png"))

    # APNG full res
    apng_frames = [fr.convert("RGB") for fr in frames]
    apng_frames[0].save(os.path.join(REPO, "img", "akame-banner-animado.png"),
                        save_all=True, append_images=apng_frames[1:],
                        duration=DELAY_MS, loop=0, optimize=True)
    print("APNG ok")

    # ---- flor sola (transparente) ----
    fsize = 260
    fl_frames = []
    for k in range(30):
        t = k / 30
        ang = 16 * math.sin(TAU * t)
        sc = 1.0 + 0.06 * math.sin(TAU * t + 1.1)
        gl = 0.7 + 0.3 * math.sin(TAU * 2 * t)
        img = make_flower(fsize, ang, sc, gl)
        canvas = Image.new("RGBA", (fsize + 90, fsize + 90), (0, 0, 0, 0))
        canvas.alpha_composite(img, ((canvas.width - img.width) // 2,
                                     (canvas.height - img.height) // 2))
        # chispas
        rnd = random.Random(k)
        for i in range(4):
            a = TAU * (t + i / 4)
            px = canvas.width / 2 + math.cos(a) * fsize * 0.55
            py = canvas.height / 2 + math.sin(a) * fsize * 0.5
            tw = max(0.0, math.sin(TAU * (t * 2 + i / 4)))
            if tw <= 0:
                continue
            sp = make_ember(2.4, (255, 150, 170), int(230 * tw))
            canvas.alpha_composite(sp, (int(px - sp.width / 2), int(py - sp.height / 2)))
        fl_frames.append(canvas)
    fl_frames[0].save(os.path.join(REPO, "img", "flor-animada.png"),
                      save_all=True, append_images=fl_frames[1:],
                      duration=40, loop=0, optimize=True)
    fl_frames[0].convert("RGBA").save(os.path.join(TMP, "flower_preview.png"))
    print("flor ok")


if __name__ == "__main__":
    main()
