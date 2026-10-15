import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { pipeline } from 'stream/promises';
import type { WASocket } from '@whiskeysockets/baileys';

const LIMITE_BYTES = 800 * 1024 * 1024; // 800 MB
const PARTES = 6;                        // descargas en paralelo para archivos grandes
const MIN_PARTE = 8 * 1024 * 1024;       // solo se parte si el archivo pesa más de 8 MB
const UA = { 'User-Agent': 'Mozilla/5.0' };

type Info = { nombre: string; link: string; tamano: number; mime: string };

const g = (global as any);
const enc = encodeURIComponent;

/** Respaldos en orden: si uno falla, se prueba el siguiente. */
const RESPALDOS: Array<{ nombre: string; pedir: (url: string) => Promise<any>; leer: (d: any) => Info | null }> = [
    {
        nombre: 'principal',
        pedir: async (url) => (await axios.get(`${g.APIs?.delirius?.url || 'https://api.delirius.online'}/download/mediafire?url=${enc(url)}`, { timeout: 25000, headers: UA })).data,
        leer: (d) => d?.data?.link ? { nombre: d.data.filename, link: d.data.link, tamano: aBytes(d.data.size), mime: d.data.mime } : null
    },
    {
        nombre: 'respaldo 1',
        pedir: async (url) => (await axios.get(`${g.APIs?.melody?.url || 'https://api.melodiaauris.qzz.io'}/download/mediafire?url=${enc(url)}&apikey=${g.APIs?.melody?.key || ''}`, { timeout: 25000, headers: UA })).data,
        leer: (d) => d?.result?.link ? { nombre: d.result.filename, link: d.result.link, tamano: aBytes(d.result.size), mime: d.result.mime } : null
    },
    {
        nombre: 'respaldo 2',
        pedir: async (url) => (await axios.get(`${g.APIs?.anabot?.url || 'https://anabot.my.id'}/api/download/mediafire?url=${enc(url)}&apikey=${g.APIs?.anabot?.key || ''}`, { timeout: 25000, headers: UA })).data,
        leer: (d) => {
            const r = d?.data?.result;
            return r?.download ? { nombre: r.filename, link: r.download, tamano: aBytes(r.filesize), mime: r.mimetype } : null;
        }
    }
];

/** "31B", "1.5 MB", "2 GB" -> bytes */
export function aBytes(v: any): number {
    if (typeof v === 'number') return v;
    const m = String(v || '').replace(',', '.').match(/([\d.]+)\s*(B|KB|MB|GB)/i);
    if (!m) return 0;
    const mult: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3 };
    return Math.round(parseFloat(m[1]) * mult[m[2].toUpperCase()]);
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/** Baja una parte del archivo con rango de bytes (reintenta 2 veces). */
async function bajarParte(link: string, desde: number, hasta: number, destino: string) {
    for (let intento = 1; intento <= 3; intento++) {
        try {
            const res = await axios.get(link, {
                responseType: 'stream', timeout: 0, headers: { ...UA, Range: `bytes=${desde}-${hasta}` }
            });
            await pipeline(res.data, fs.createWriteStream(destino));
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
export async function descargarArchivo(info: Info, destino: string): Promise<void> {
    const head = await axios.head(info.link, { headers: UA, timeout: 20000, validateStatus: () => true }).catch(() => null);
    const total = Number(head?.headers?.['content-length']) || info.tamano;
    if (!total) throw new Error('No pude saber el tamaño del archivo');
    if (total > LIMITE_BYTES) throw new Error(`El archivo pesa más de ${mb(LIMITE_BYTES)}`);

    const acepta = head?.headers?.['accept-ranges'] === 'bytes';
    if (!acepta || total < MIN_PARTE) {
        const res = await axios.get(info.link, { responseType: 'stream', timeout: 0, headers: UA });
        await pipeline(res.data, fs.createWriteStream(destino));
    } else {
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
        for (const ruta of partes) {
            await pipeline(fs.createReadStream(ruta), fs.createWriteStream(destino, { flags: 'a' }));
            fs.unlinkSync(ruta);
        }
    }

    const real = fs.statSync(destino).size;
    if (total && real !== total) throw new Error('El archivo llegó incompleto');
}

/** Busca el archivo en los respaldos en orden y lo baja con el primero que funcione. */
async function obtenerYDescargar(url: string, destino: string): Promise<{ info: Info; carpeta?: any[]; nombreCarpeta?: string }> {
    let ultimoError = 'sin respuesta';
    for (const r of RESPALDOS) {
        try {
            const data = await r.pedir(url);
            // Carpeta: solo la devuelve el principal
            if (Array.isArray(data?.datos)) return { info: null as any, carpeta: data.datos, nombreCarpeta: data.carpeta };
            const info = r.leer(data);
            if (!info) { ultimoError = `${r.nombre} no devolvió el archivo`; continue; }
            await descargarArchivo(info, destino);
            return { info };
        } catch (e: any) {
            ultimoError = e?.message || ultimoError;
            if (String(e?.message).includes('más de')) throw e; // el límite no cambia con otro respaldo
            fs.rmSync(destino, { force: true });
        }
    }
    throw new Error(ultimoError);
}

/** Borra el archivo temporal y cualquier parte que haya quedado a medias. */
function limpiar(destino: string) {
    fs.rmSync(destino, { force: true });
    const dir = path.dirname(destino);
    const base = path.basename(destino);
    for (const f of fs.readdirSync(dir)) {
        if (f.startsWith(base + '.parte')) fs.rmSync(path.join(dir, f), { force: true });
    }
}

export default {
    command: ['mediafire', 'mf', 'mfire'],
    description: 'Descarga archivos de MediaFire (hasta 800 MB), con respaldos',
    category: 'download',

    run: async ({ sock, m, chat, args }: { sock: WASocket; m: any; chat: string; args: string[] }): Promise<void> => {
        if (!args[0]) {
            await sock.sendMessage(chat, { text: '✿ Pasa el link de mediafire bb\n\nEjemplo: *.mf https://www.mediafire.com/file/xxxxx/file*' }, { quoted: m });
            return;
        }

        const url = args[0];
        if (!url.includes('mediafire.com')) {
            await sock.sendMessage(chat, { text: '✿ Ese no es un link de mediafire bb ✿' }, { quoted: m });
            return;
        }

        const destino = path.join(os.tmpdir(), `mf-${randomBytes(6).toString('hex')}`);
        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });

            const { info, carpeta, nombreCarpeta } = await obtenerYDescargar(url, destino);

            // Carpeta: solo se lista (no se descarga)
            if (carpeta) {
                let list = `♡ AKAME-MD - MEDIAFIRE FOLDER ♡\n\n✿ Carpeta: ${nombreCarpeta || 'Desconocida'}\n✿ Archivos: ${carpeta.length}\n\n`;
                carpeta.slice(0, 15).forEach((f: any, i: number) => {
                    const name = f['nombre de archivo'] || f.filename || 'sin nombre';
                    const size = f.tamaño || f.size || '?';
                    list += `*${i + 1}.* ${name} - ${size}\n> ${f.link}\n\n`;
                });
                if (carpeta.length > 15) list += `✿...y ${carpeta.length - 15} archivos más ♡`;
                await sock.sendMessage(chat, { text: list }, { quoted: m });
                await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
                return;
            }

            const tamano = fs.statSync(destino).size;
            await sock.sendMessage(chat, {
                document: { stream: fs.createReadStream(destino) },
                mimetype: info.mime || 'application/octet-stream',
                fileName: info.nombre || 'archivo',
                caption: `♡ AKAME-MD - MEDIAFIRE ♡\n\n✿ *Nombre:* ${info.nombre}\n✿ *Peso:* ${mb(tamano)}`
            }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
        } catch (e: any) {
            console.error('[MF ERROR]', e?.message);
            const limite = String(e?.message).includes('más de');
            await sock.sendMessage(chat, {
                text: limite
                    ? `✿ Ese archivo pesa más de 800 MB bb, no lo puedo enviar.`
                    : `✿ No pude descargar ese archivo bb. Prueba otra vez o con otro link.`
            }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
        } finally {
            limpiar(destino);
        }
    }
};
