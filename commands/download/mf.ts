import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { aBytes, descargarArchivo, mb, UA, type Info } from '../../lib/descarga.ts';
import type { WASocket } from '@whiskeysockets/baileys';

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
