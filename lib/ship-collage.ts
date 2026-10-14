import { Jimp, loadFont, measureText } from 'jimp';
import { SANS_32_WHITE } from 'jimp/fonts';

/**
 * Collage del comando .ship: dos fotos de perfil en círculo, un corazón al centro
 * con el porcentaje de amor, sobre un fondo degradado rosa→morado.
 */

const W = 900;
const H = 500;
const R = 135;                  // radio de cada foto
const CENTRO_Y = 250;
const IZQ: [number, number] = [215, CENTRO_Y];
const DER: [number, number] = [685, CENTRO_Y];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Colores: rosa arriba, morado abajo
const COLOR_ARRIBA = [255, 143, 177];
const COLOR_ABAJO = [176, 124, 255];

/** Foto cuadrada recortada en círculo con borde blanco. */
const fotoCircular = (base: any, radio: number): any => {
    const lado = radio * 2;
    const foto = base.clone().cover({ w: lado, h: lado });
    const salida = new Jimp({ width: lado + 12, height: lado + 12, color: 0x00000000 });

    // Borde blanco
    const borde = new Jimp({ width: lado + 12, height: lado + 12, color: 0x00000000 });
    const c = (lado + 12) / 2;
    borde.scan(0, 0, borde.width, borde.height, (x: number, y: number, idx: number) => {
        const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
        if (d <= c) {
            borde.bitmap.data[idx] = 255; borde.bitmap.data[idx + 1] = 255;
            borde.bitmap.data[idx + 2] = 255; borde.bitmap.data[idx + 3] = 255;
        }
    });
    salida.composite(borde, 0, 0);

    // Foto recortada en círculo
    const r = radio;
    foto.scan(0, 0, foto.width, foto.height, (x: number, y: number, idx: number) => {
        const d = Math.hypot(x + 0.5 - r, y + 0.5 - r);
        if (d > r) foto.bitmap.data[idx + 3] = 0;
    });
    salida.composite(foto, 6, 6);
    return salida;
};

/** Avatar de respaldo (sin foto): círculo de color según el número. */
export const avatarRespaldo = (seed: string): any => {
    let h = 0;
    for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const base = new Jimp({ width: 2 * R, height: 2 * R, color: 0xffffffff });
    const color = [(h & 0xff) | 0x40, ((h >> 8) & 0xff) | 0x40, ((h >> 16) & 0xff) | 0x40];
    base.scan(0, 0, base.width, base.height, (x: number, y: number, idx: number) => {
        base.bitmap.data[idx] = color[0];
        base.bitmap.data[idx + 1] = color[1];
        base.bitmap.data[idx + 2] = color[2];
        base.bitmap.data[idx + 3] = 255;
    });
    return base;
};

/** Corazón: (x²+y²−1)³ − x²y³ ≤ 0, dibujado en rojo-rosado. */
const dibujarCorazon = (lienzo: any, cx: number, cy: number, escala: number) => {
    const color = [255, 61, 110];
    for (let y = Math.floor(cy - escala * 1.4); y <= cy + escala * 1.4; y++) {
        for (let x = Math.floor(cx - escala * 1.4); x <= cx + escala * 1.4; x++) {
            if (x < 0 || y < 0 || x >= lienzo.width || y >= lienzo.height) continue;
            const nx = (x - cx) / escala;
            const ny = -(y - cy) / escala;
            const f = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * ny * ny * ny;
            if (f <= 0) {
                const idx = (lienzo.width * y + x) * 4;
                lienzo.bitmap.data[idx] = color[0];
                lienzo.bitmap.data[idx + 1] = color[1];
                lienzo.bitmap.data[idx + 2] = color[2];
                lienzo.bitmap.data[idx + 3] = 255;
            }
        }
    }
};

const fondo = (): any => {
    const img = new Jimp({ width: W, height: H, color: 0xffffffff });
    img.scan(0, 0, W, H, (x: number, y: number, idx: number) => {
        const t = y / (H - 1);
        img.bitmap.data[idx] = lerp(COLOR_ARRIBA[0], COLOR_ABAJO[0], t);
        img.bitmap.data[idx + 1] = lerp(COLOR_ARRIBA[1], COLOR_ABAJO[1], t);
        img.bitmap.data[idx + 2] = lerp(COLOR_ARRIBA[2], COLOR_ABAJO[2], t);
        img.bitmap.data[idx + 3] = 255;
    });
    // Puntitos decorativos (fijos, para que siempre salgan igual)
    const puntos: [number, number, number][] = [
        [60, 60, 6], [840, 70, 8], [120, 430, 7], [790, 440, 6], [430, 40, 5], [450, 470, 6],
        [340, 90, 4], [560, 410, 4], [40, 240, 5], [870, 260, 5]
    ];
    for (const [px, py, pr] of puntos) {
        for (let y = py - pr; y <= py + pr; y++) {
            for (let x = px - pr; x <= px + pr; x++) {
                if (Math.hypot(x - px, y - py) > pr) continue;
                const idx = (W * y + x) * 4;
                img.bitmap.data[idx] = 255; img.bitmap.data[idx + 1] = 255;
                img.bitmap.data[idx + 2] = 255; img.bitmap.data[idx + 3] = 90;
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

    const a = fotoCircular(foto1 || avatarRespaldo(seed1), R);
    const b = fotoCircular(foto2 || avatarRespaldo(seed2), R);
    lienzo.composite(a, IZQ[0] - a.width / 2, IZQ[1] - a.height / 2);
    lienzo.composite(b, DER[0] - b.width / 2, DER[1] - b.height / 2);

    // Corazón al centro, con el porcentaje encima
    dibujarCorazon(lienzo, W / 2, CENTRO_Y + 4, 66);

    const fuente = await loadFont(SANS_32_WHITE);
    const texto = `${porcentaje}%`;
    const ancho = measureText(fuente, texto);
    lienzo.print({
        font: fuente,
        x: Math.round(W / 2 - ancho / 2),
        y: CENTRO_Y - 16,
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
