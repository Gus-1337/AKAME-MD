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

/** Tipo MIME según la extensión del archivo (los respaldos a veces lo mandan vacío o genérico). */
const MIMES: Record<string, string> = {
    zip: 'application/zip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    apk: 'application/vnd.android.package-archive',
    xapk: 'application/zip',
    apks: 'application/zip',
    obb: 'application/octet-stream',
    pdf: 'application/pdf',
    txt: 'text/plain',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    mp4: 'video/mp4',
    mkv: 'video/x-matroska',
    mp3: 'audio/mpeg',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    iso: 'application/x-iso9660-image',
    exe: 'application/x-msdownload',
    json: 'application/json',
    html: 'text/html'
};

const mimeDe = (nombre: string, mime?: string): string => {
    const ext = path.extname(nombre || '').slice(1).toLowerCase();
    if (MIMES[ext]) return MIMES[ext];
    if (mime && mime !== 'application/octet-stream') return mime;
    return 'application/octet-stream';
};

const VERIFICACION = 'MEDIAFIRE_VERIFICACION';

/** ¿El archivo descargado es una página HTML (no el archivo real)? */
function esPaginaHtml(ruta: string): boolean {
    const fd = fs.openSync(ruta, 'r');
    try {
        const buf = Buffer.alloc(64);
        const leidos = fs.readSync(fd, buf, 0, 64, 0);
        const inicio = buf.subarray(0, leidos).toString('utf8').trimStart().toLowerCase();
        return inicio.startsWith('<!doctype') || inicio.startsWith('<html');
    } finally {
        fs.closeSync(fd);
    }
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
            // MediaFire a veces responde una página de verificación (captcha) en vez del archivo
            if (esPaginaHtml(destino)) throw new Error(VERIFICACION);
            return { info };
        } catch (e: any) {
            // Si MediaFire mandó su página de captcha, el tamaño no cuadra y falla antes; aquí se revisa
            if (fs.existsSync(destino) && esPaginaHtml(destino)) throw new Error(VERIFICACION);
            ultimoError = e?.message || ultimoError;
            if (String(e?.message).includes('más de')) throw e; // el límite no cambia con otro respaldo
            if (String(e?.message) === VERIFICACION) throw e; // otro respaldo recibe la misma página
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
                mimetype: mimeDe(info.nombre, info.mime),
                fileName: info.nombre || 'archivo',
                caption: `♡ AKAME-MD - MEDIAFIRE ♡\n\n✿ *Nombre:* ${info.nombre}\n✿ *Peso:* ${mb(tamano)}`
            }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
        } catch (e: any) {
            console.error('[MF ERROR]', e?.message);
            const limite = String(e?.message).includes('más de');
            const verificacion = String(e?.message) === VERIFICACION;
            await sock.sendMessage(chat, {
                text: limite
                    ? `✿ Ese archivo pesa más de 800 MB bb, no lo puedo enviar.`
                    : verificacion
                        ? `✿ MediaFire pide verificación humana (captcha) para bajar ese archivo bb, y el bot no puede resolverlo. Prueba con otro link.`
                        : `✿ No pude descargar ese archivo bb. Prueba otra vez o con otro link.`
            }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
        } finally {
            limpiar(destino);
        }
    }
};
