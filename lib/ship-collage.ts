import { Jimp, loadFont, measureText } from 'jimp';
import { SANS_32_WHITE } from 'jimp/fonts';

/**
 * Collage del comando .ship: dos fotos de perfil en círculo con anillo degradado y sombra,
 * un corazón con brillo al centro y un badge con el porcentaje, sobre un fondo rosa→morado.
 */

const W = 900;
const H = 500;
const R = 130;                  // radio de cada foto
const CENTRO_Y = 240;
const IZQ: [number, number] = [215, CENTRO_Y];
const DER: [number, number] = [685, CENTRO_Y];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Colores del fondo: rosa arriba, morado abajo
const COLOR_ARRIBA = [255, 143, 177];
const COLOR_ABAJO = [150, 105, 245];

/** Mezcla un píxel con alpha sobre el buffer (alpha 0-255). */
const pixel = (img: any, x: number, y: number, rgb: number[], alpha = 255) => {
    if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
    const idx = (img.width * y + x) * 4;
    const a = alpha / 255;
    const d = img.bitmap.data;
    d[idx] = lerp(d[idx], rgb[0], a);
    d[idx + 1] = lerp(d[idx + 1], rgb[1], a);
    d[idx + 2] = lerp(d[idx + 2], rgb[2], a);
    d[idx + 3] = Math.min(255, d[idx + 3] + alpha);
};

/** Capa transparente con el color indicado en RGB (para que el desenfoque no oscurezca). */
const capaColor = (w: number, h: number, rgb: number[]): any => {
    const img = new Jimp({ width: w, height: h, color: 0x00000000 });
    for (let i = 0; i < img.bitmap.data.length; i += 4) {
        img.bitmap.data[i] = rgb[0];
        img.bitmap.data[i + 1] = rgb[1];
        img.bitmap.data[i + 2] = rgb[2];
    }
    return img;
};

/** Círculo con anillo degradado (rosa → lila) y foto recortada en el centro. */
const fotoCircular = (base: any, radio: number, grosor: number): any => {
    const lado = radio * 2;
    const total = lado + grosor * 2;
    const c = total / 2;
    const foto = base.clone().cover({ w: lado, h: lado });
    const salida = new Jimp({ width: total, height: total, color: 0x00000000 });

    // Anillo degradado en diagonal
    for (let y = 0; y < total; y++) {
        for (let x = 0; x < total; x++) {
            const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
            if (d > c) continue;
            const t = (x + y) / (2 * total);
            const rgb = [lerp(255, 196, t), lerp(77, 130, t), lerp(141, 255, t)];
            pixel(salida, x, y, rgb, 255);
        }
    }

    // Foto recortada en círculo, encima del anillo
    const r = radio;
    for (let y = 0; y < lado; y++) {
        for (let x = 0; x < lado; x++) {
            const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
            if (d > r) continue;
            const idx = (foto.width * y + x) * 4;
            const rgb = [foto.bitmap.data[idx], foto.bitmap.data[idx + 1], foto.bitmap.data[idx + 2]];
            pixel(salida, x + grosor, y + grosor, rgb, 255);
        }
    }
    return salida;
};

/** Sombra suave: disco negro translúcido desenfocado. */
const sombra = (diametro: number): any => {
    const s = capaColor(diametro + 60, diametro + 60, [60, 0, 80]);
    const c = s.width / 2;
    for (let y = 0; y < s.height; y++) {
        for (let x = 0; x < s.width; x++) {
            if (Math.hypot(x + 0.5 - c, y + 0.5 - c) <= diametro / 2) pixel(s, x, y, [60, 0, 80], 120);
        }
    }
    s.blur(12);
    return s;
};

/** Avatar de respaldo (sin foto): degradado de color según el número. */
export const avatarRespaldo = (seed: string): any => {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const c1 = [(h & 0xff) | 0x40, ((h >> 8) & 0xff) | 0x40, ((h >> 16) & 0xff) | 0x40];
    const c2 = [255, 255, 255];
    const base = new Jimp({ width: 2 * R, height: 2 * R, color: 0xffffffff });
    for (let y = 0; y < base.height; y++) {
        for (let x = 0; x < base.width; x++) {
            const t = (x + y) / (2 * base.width);
            pixel(base, x, y, [lerp(c1[0], c2[0], t * 0.3), lerp(c1[1], c2[1], t * 0.3), lerp(c1[2], c2[2], t * 0.3)], 255);
        }
    }
    return base;
};

/** Fórmula del corazón: (x²+y²−1)³ − x²y³ ≤ 0. */
const enCorazon = (nx: number, ny: number) => Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * ny * ny * ny <= 0;

/** Corazón con degradado rojo→rosa, brillo alrededor y borde blanco fino. */
const dibujarCorazon = (lienzo: any, cx: number, cy: number, escala: number) => {
    // Brillo: corazón más grande, rosa translúcido, desenfocado
    const glow = capaColor(lienzo.width, lienzo.height, [255, 60, 120]);
    for (let y = Math.floor(cy - escala * 2); y <= cy + escala * 2; y++) {
        for (let x = Math.floor(cx - escala * 2); x <= cx + escala * 2; x++) {
            if (enCorazon((x - cx) / (escala * 1.5), -(y - cy) / (escala * 1.5))) pixel(glow, x, y, [255, 60, 120], 150);
        }
    }
    glow.blur(14);
    lienzo.composite(glow, 0, 0);

    // Borde blanco
    for (let y = Math.floor(cy - escala * 1.5); y <= cy + escala * 1.5; y++) {
        for (let x = Math.floor(cx - escala * 1.5); x <= cx + escala * 1.5; x++) {
            if (enCorazon((x - cx) / (escala * 1.06), -(y - cy) / (escala * 1.06))) pixel(lienzo, x, y, [255, 255, 255], 255);
        }
    }
    // Relleno con degradado vertical
    for (let y = Math.floor(cy - escala * 1.5); y <= cy + escala * 1.5; y++) {
        for (let x = Math.floor(cx - escala * 1.5); x <= cx + escala * 1.5; x++) {
            if (!enCorazon((x - cx) / escala, -(y - cy) / escala)) continue;
            const t = Math.min(1, Math.max(0, (y - (cy - escala)) / (2 * escala)));
            pixel(lienzo, x, y, [lerp(255, 230, t), lerp(40, 80, t), lerp(100, 150, t)], 255);
        }
    }
};

/** Badge redondeado semitransparente detrás del porcentaje. */
const badge = (lienzo: any, cx: number, cy: number, ancho: number, alto: number) => {
    const x0 = Math.round(cx - ancho / 2), y0 = Math.round(cy - alto / 2);
    const rad = alto / 2;
    for (let y = y0; y < y0 + alto; y++) {
        for (let x = x0; x < x0 + ancho; x++) {
            let dentro = true;
            const dx = x < x0 + rad ? (x0 + rad) - x : x > x0 + ancho - rad ? x - (x0 + ancho - rad) : 0;
            const dy = y < y0 + rad ? (y0 + rad) - y : y > y0 + alto - rad ? y - (y0 + alto - rad) : 0;
            if (dx > 0 && dy > 0 && Math.hypot(dx, dy) > rad) dentro = false;
            if (dentro) pixel(lienzo, x, y, [90, 0, 60], 85);
        }
    }
};

const fondo = (): any => {
    const img = new Jimp({ width: W, height: H, color: 0xffffffff });
    for (let y = 0; y < H; y++) {
        const t = y / (H - 1);
        for (let x = 0; x < W; x++) {
            // Degradado vertical con un leve desplazamiento horizontal
            const k = Math.min(1, Math.max(0, t + (x / W - 0.5) * 0.15));
            pixel(img, x, y, [lerp(COLOR_ARRIBA[0], COLOR_ABAJO[0], k), lerp(COLOR_ARRIBA[1], COLOR_ABAJO[1], k), lerp(COLOR_ARRIBA[2], COLOR_ABAJO[2], k)], 255);
        }
    }
    // Brillos suaves (círculos translúcidos desenfocados)
    const brillos: [number, number, number][] = [[140, 90, 110], [760, 400, 130], [450, 250, 160]];
    const halo = capaColor(W, H, [255, 255, 255]);
    for (const [bx, by, br] of brillos) {
        for (let y = by - br; y <= by + br; y++) {
            for (let x = bx - br; x <= bx + br; x++) {
                if (Math.hypot(x - bx, y - by) <= br) pixel(halo, x, y, [255, 255, 255], 35);
            }
        }
    }
    halo.blur(30);
    img.composite(halo, 0, 0);

    // Puntitos decorativos
    const puntos: [number, number, number][] = [
        [60, 60, 6], [840, 70, 8], [120, 430, 7], [790, 440, 6], [430, 40, 5], [450, 470, 6],
        [340, 90, 4], [560, 410, 4], [40, 240, 5], [870, 260, 5], [260, 470, 3], [640, 30, 3]
    ];
    for (const [px, py, pr] of puntos) {
        for (let y = py - pr; y <= py + pr; y++) {
            for (let x = px - pr; x <= px + pr; x++) {
                if (Math.hypot(x - px, y - py) <= pr) pixel(img, x, y, [255, 255, 255], 110);
            }
        }
    }
    return img;
};

/**
 * Arma el collage. `foto1` y `foto2` son imágenes de Jimp (o null para usar avatar de respaldo).
 */
export const crearCollage = async (
    foto1: any | null,
    foto2: any | null,
    seed1: string,
    seed2: string,
    porcentaje: number
): Promise<Buffer> => {
    const lienzo = fondo();
    const grosor = 8;

    // Sombra + foto para cada persona
    for (const [centro, foto, seed] of [[IZQ, foto1, seed1], [DER, foto2, seed2]] as [[number, number], any, string][]) {
        const f = fotoCircular(foto || avatarRespaldo(seed), R, grosor);
        const s = sombra(f.width);
        lienzo.composite(s, centro[0] - s.width / 2 + 6, centro[1] - s.height / 2 + 10);
        lienzo.composite(f, centro[0] - f.width / 2, centro[1] - f.height / 2);
    }

    // Corazón al centro con badge del porcentaje encima
    dibujarCorazon(lienzo, W / 2, CENTRO_Y + 6, 58);

    const texto = `${porcentaje}%`;
    const fuente = await loadFont(SANS_32_WHITE);
    const ancho = measureText(fuente, texto);
    badge(lienzo, W / 2, CENTRO_Y + 6, ancho + 34, 52);
    lienzo.print({
        font: fuente,
        x: Math.round(W / 2 - ancho / 2),
        y: CENTRO_Y - 10,
        text: texto
    });

    return await lienzo.getBuffer('image/png');
};

/** Descarga una imagen por URL. Devuelve null si falla. */
export const descargarFoto = async (url: string): Promise<any | null> => {
    try {
        return await Jimp.read(url);
    } catch {
        return null;
    }
};
