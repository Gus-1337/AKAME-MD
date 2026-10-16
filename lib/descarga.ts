import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

// Descarga compartida (MediaFire, APK...): baja en partes en paralelo si el servidor acepta rangos.
export const LIMITE_BYTES = 800 * 1024 * 1024; // 800 MB
const PARTES = 6;                        // descargas en paralelo para archivos grandes
const MIN_PARTE = 8 * 1024 * 1024;       // solo se parte si el archivo pesa más de 8 MB
export const UA = { 'User-Agent': 'Mozilla/5.0' };

export type Info = { nombre: string; link: string; tamano: number; mime: string };

/** "31B", "1.5 MB", "2 GB" -> bytes */
export function aBytes(v: any): number {
    if (typeof v === 'number') return v;
    const m = String(v || '').replace(',', '.').match(/([\d.]+)\s*(B|KB|MB|GB)/i);
    if (!m) return 0;
    const mult: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
    return Math.round(parseFloat(m[1]) * mult[m[2].toUpperCase()]);
}

export const mb = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Baja una parte del archivo con rango de bytes (reintenta 2 veces). */
async function bajarParte(link: string, desde: number, hasta: number, destino: string) {
    for (let intento = 1; intento <= 3; intento++) {
        try {
            const res = await axios.get(link, {
                responseType: 'stream', timeout: 0, headers: { ...UA, Range: `bytes=${desde}-${hasta}` }
            });
            await pipeline(res.data, fs.createWriteStream(destino));
            // La parte tiene que pesar exactamente lo pedido; si no, se reintenta
            if (fs.statSync(destino).size !== hasta - desde + 1) throw new Error('parte incompleta');
            return;
        } catch (e) {
            if (intento === 3) throw e;
        }
    }
}

/**
 * Descarga el archivo a disco. Si el servidor acepta rangos y el archivo es grande,
 * lo baja en partes a la vez (más rápido) y las une en orden.
 */
export async function descargarArchivo(info: Info, destino: string, limite: number = LIMITE_BYTES): Promise<void> {
    const head = await axios.head(info.link, { headers: UA, timeout: 20000, validateStatus: () => true }).catch(() => null);
    const total = Number(head?.headers?.['content-length']) || info.tamano;
    if (!total) throw new Error('No pude saber el tamaño del archivo');
    if (total > limite) throw new Error(`El archivo pesa más de ${mb(limite)}`);

    const acepta = head?.headers?.['accept-ranges'] === 'bytes';
    let porPartes = acepta && total >= MIN_PARTE;
    if (porPartes) {
        try {
            const tam = Math.ceil(total / PARTES);
            const partes: string[] = [];
            const tareas: Promise<void>[] = [];
            for (let i = 0; i < PARTES; i++) {
                const desde = i * tam;
                const hasta = Math.min(total - 1, desde + tam - 1);
                if (desde > hasta) break;
                const ruta = `${destino}.parte${i}`;
                partes.push(ruta);
                tareas.push(bajarParte(info.link, desde, hasta, ruta));
            }
            await Promise.all(tareas);

            // Se unen en orden
            fs.rmSync(destino, { force: true });
            for (const ruta of partes) {
                await pipeline(fs.createReadStream(ruta), fs.createWriteStream(destino, { flags: 'a' }));
                fs.unlinkSync(ruta);
            }
        } catch {
            // Si las partes fallan, se limpia y se baja de una sola vez
            const dir = path.dirname(destino);
            const base = path.basename(destino);
            for (const f of fs.readdirSync(dir)) {
                if (f.startsWith(base + '.parte')) fs.rmSync(path.join(dir, f), { force: true });
            }
            fs.rmSync(destino, { force: true });
            porPartes = false;
        }
    }
    if (!porPartes) {
        const res = await axios.get(info.link, { responseType: 'stream', timeout: 0, headers: UA });
        await pipeline(res.data, fs.createWriteStream(destino));
    }

    const real = fs.statSync(destino).size;
    if (total && real !== total) throw new Error('El archivo llegó incompleto');
}

