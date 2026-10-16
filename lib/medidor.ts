import { Jimp, loadFont, measureText } from 'jimp';
import { SANS_32_WHITE, SANS_64_WHITE } from 'jimp/fonts';
import { avatarRespaldo, descargarFoto } from './ship-collage.ts';

/**
 * Portada circular de los medidores: foto de perfil recortada en círculo,
 * borde de colores que gira alrededor, fondo degradado y textos abajo.
 */

const LADO = 800;

export type OpcionesPortada = {
    titulo: string;                  // texto arriba del porcentaje
    borde: number[][];               // colores del borde (en círculo)
    paletas: number[][][];           // fondos posibles (se elige uno al azar)
};

/** Bandera arcoíris (gay). */
export const ARCOIRIS = [
    [228, 3, 3], [255, 140, 0], [255, 237, 0], [0, 128, 38], [0, 77, 255], [117, 7, 135]
];

/** Bandera lésbica (colores oficiales: naranja, naranja claro, blanco, rosa, malva, magenta). */
export const LESBICA = [
    [213, 45, 0], [239, 118, 39], [255, 154, 86], [255, 255, 255], [209, 98, 164], [181, 86, 144], [163, 2, 98]
];

/** Fondos rosas con varios colores (se elige uno al azar). */
export const PALETAS_ROSA: number[][][] = [
    [[255, 126, 185], [255, 101, 163], [200, 109, 215]],
    [[255, 150, 200], [255, 105, 180], [150, 120, 255], [120, 200, 255]],
    [[255, 140, 190], [255, 190, 120], [255, 110, 170]],
    [[255, 120, 180], [190, 110, 255], [100, 190, 255]]
];

/** Fondos morados y rosas para el medidor lésbico. */
export const PALETAS_LESBICA: number[][][] = [
    [[163, 2, 98], [181, 86, 144], [209, 98, 164]],
    [[213, 45, 0], [181, 86, 144], [163, 2, 98]],
    [[255, 154, 86], [209, 98, 164], [163, 2, 98], [120, 60, 160]],
    [[239, 118, 39], [209, 98, 164], [117, 7, 135]]
];

/** Foto de perfil del usuario; si no tiene, avatar de respaldo. */
export async function fotoDePerfil(sock: any, who: string): Promise<any> {
    let foto: any = null;
    try {
        const url = await sock.profilePictureUrl(who, 'image');
        if (url) foto = await descargarFoto(url);
    } catch { /* sin foto */ }
    return foto || avatarRespaldo(who.split('@')[0]);
}

/** Dibuja la portada circular con el porcentaje. Devuelve un PNG. */
export async function crearPortadaMedidor(foto: any, porcentaje: number, nombre: string, op: OpcionesPortada): Promise<Buffer> {
    const N = LADO;
    const CX = N / 2;
    const CY = 330;                 // centro del círculo
    const R = 230;                  // radio de la foto
    const GROSOR = 22;              // grosor del borde

    const lienzo = new Jimp({ width: N, height: N, color: 0xffffffff });
    const d = lienzo.bitmap.data;

    // Fondo: degradado de colores; cada vez sale una combinación distinta
    const paleta = op.paletas[Math.floor(Math.random() * op.paletas.length)];
    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            const t = (x + y) / (2 * N);
            const pos = t * (paleta.length - 1);
            const a = Math.floor(pos);
            const b = Math.min(paleta.length - 1, a + 1);
            const k = pos - a;
            const i = (y * N + x) * 4;
            d[i] = paleta[a][0] + (paleta[b][0] - paleta[a][0]) * k;
            d[i + 1] = paleta[a][1] + (paleta[b][1] - paleta[a][1]) * k;
            d[i + 2] = paleta[a][2] + (paleta[b][2] - paleta[a][2]) * k;
            d[i + 3] = 255;
        }
    }

    // Foto recortada en el centro del círculo
    const dim = R * 2;
    const f = foto.clone().cover({ w: dim, h: dim });
    const fd = f.bitmap.data;

    for (let y = CY - R - GROSOR; y <= CY + R + GROSOR; y++) {
        for (let x = CX - R - GROSOR; x <= CX + R + GROSOR; x++) {
            if (x < 0 || y < 0 || x >= N || y >= N) continue;
            const dx = x + 0.5 - CX;
            const dy = y + 0.5 - CY;
            const dist = Math.hypot(dx, dy);
            const i = (y * N + x) * 4;

            if (dist <= R) {
                const fx = Math.min(dim - 1, Math.max(0, Math.floor(x - (CX - R))));
                const fy = Math.min(dim - 1, Math.max(0, Math.floor(y - (CY - R))));
                const j = (fy * dim + fx) * 4;
                d[i] = fd[j];
                d[i + 1] = fd[j + 1];
                d[i + 2] = fd[j + 2];
            } else if (dist <= R + GROSOR) {
                // Borde de colores que gira alrededor del círculo
                const colores = op.borde;
                const ang = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI);
                const pos = ang * colores.length;
                const a = Math.floor(pos) % colores.length;
                const b = (a + 1) % colores.length;
                const k = pos - Math.floor(pos);
                d[i] = colores[a][0] + (colores[b][0] - colores[a][0]) * k;
                d[i + 1] = colores[a][1] + (colores[b][1] - colores[a][1]) * k;
                d[i + 2] = colores[a][2] + (colores[b][2] - colores[a][2]) * k;
            }
        }
    }

    const fuenteGrande = await loadFont(SANS_64_WHITE);
    const fuenteChica = await loadFont(SANS_32_WHITE);

    const tw = measureText(fuenteChica, op.titulo);
    lienzo.print({ font: fuenteChica, x: Math.round((N - tw) / 2), y: CY + R + GROSOR + 26, text: op.titulo });

    const pct = `${porcentaje}%`;
    const pw = measureText(fuenteGrande, pct);
    lienzo.print({ font: fuenteGrande, x: Math.round((N - pw) / 2), y: CY + R + GROSOR + 62, text: pct });

    const nombreCorto = nombre.length > 28 ? nombre.slice(0, 27) + '…' : nombre;
    const nw = measureText(fuenteChica, nombreCorto);
    lienzo.print({ font: fuenteChica, x: Math.round((N - nw) / 2), y: N - 52, text: nombreCorto });

    return await lienzo.getBuffer('image/png');
}
