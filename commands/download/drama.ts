import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { descargarArchivo, mb, type Info } from '../../lib/descarga.ts';

const LIMITE_DRAMA = 500 * 1024 * 1024; // 500 MB
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

const limpiarNombre = (n: string) => String(n || 'drama').replace(/[\\/:*?"<>|]/g, '').trim() || 'drama';

/** Nombre del archivo: el de Content-Disposition, o el último segmento del link. */
function nombreDesde(link: string, cabeceras: any): string {
    const cd = String(cabeceras?.['content-disposition'] || '');
    const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
    if (m) return decodeURIComponent(m[1]);
    try {
        const ruta = decodeURIComponent(new URL(link).pathname.split('/').pop() || '');
        if (ruta) return ruta;
    } catch { /* link raro: se usa el nombre genérico */ }
    return 'drama.mp4';
}

export default {
    command: ['drama', 'dramas'],
    description: 'Descarga un drama desde un link directo (hasta 500 MB)',
    category: 'download',

    run: async (ctx: any): Promise<void> => {
        const { sock, chat, args, usedPrefix } = ctx;
        const m = ctx.m ?? ctx.msg;

        const link = String(args?.[0] || '').trim();
        if (!link) {
            await sock.sendMessage(chat, {
                text: caja('DRAMA', [
                    `✧ Usa *${usedPrefix}drama <link directo>*`,
                    '✦ El link tiene que terminar en el archivo (.mp4, .mkv...).',
                    `✦ Límite: *${mb(LIMITE_DRAMA)}*`
                ])
            }, { quoted: m });
            return;
        }

        let url: URL;
        try {
            url = new URL(link);
            if (!/^https?:$/.test(url.protocol)) throw new Error('protocolo');
        } catch {
            await sock.sendMessage(chat, { text: caja('DRAMA', ['✧ Ese link no es válido.']) }, { quoted: m });
            return;
        }

        // Los links .m3u8 son listas de streaming (se parten en muchos pedazos): no se pueden bajar como archivo
        if (/\.m3u8(\?|$)/i.test(url.pathname + url.search)) {
            await sock.sendMessage(chat, {
                text: caja('DRAMA', ['✧ Ese link es de streaming (.m3u8).', '✦ Necesito el link directo del archivo (.mp4 o similar).'])
            }, { quoted: m });
            return;
        }

        const destino = path.join(os.tmpdir(), `drama-${randomBytes(6).toString('hex')}`);
        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });

            // Se revisa antes de bajar: tipo de archivo y tamaño
            const head = await axios.head(url.href, { headers: UA, timeout: 20000, validateStatus: () => true }).catch(() => null);
            const tipo = String(head?.headers?.['content-type'] || '');
            if (tipo.includes('text/html') || tipo.includes('application/json')) {
                throw new Error('El link no es un archivo directo');
            }
            const tamano = Number(head?.headers?.['content-length']) || 0;
            if (tamano > LIMITE_DRAMA) throw new Error(`El archivo pesa más de ${mb(LIMITE_DRAMA)}`);

            const nombre = nombreDesde(url.href, head?.headers);
            const info: Info = {
                nombre,
                link: url.href,
                tamano,
                mime: tipo.split(';')[0] || 'video/mp4'
            };
            await descargarArchivo(info, destino, LIMITE_DRAMA);

            const real = fs.statSync(destino).size;
            await sock.sendMessage(chat, {
                document: { stream: fs.createReadStream(destino) },
                mimetype: info.mime,
                fileName: limpiarNombre(nombre),
                caption: caja('DRAMA', [`✧ *${limpiarNombre(nombre)}*`, `✦ Peso » *${mb(real)}*`])
            }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
        } catch (e: any) {
            console.error('[DRAMA ERROR]', e?.message);
            const msg = String(e?.message || '');
            const texto = msg.includes('más de')
                ? caja('DRAMA', [`✧ Ese archivo pesa más de ${mb(LIMITE_DRAMA)}, no lo puedo enviar.`])
                : msg.includes('no es un archivo')
                    ? caja('DRAMA', ['✧ Ese link no lleva a un archivo directo.', '✦ Revisa que termine en el archivo (.mp4...).'])
                    : caja('DRAMA', ['✧ No pude descargar ese archivo.', '✦ Prueba otra vez o con otro link.']);
            await sock.sendMessage(chat, { text: texto }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
        } finally {
            fs.rmSync(destino, { force: true });
            const dir = path.dirname(destino);
            const base = path.basename(destino);
            for (const f of fs.readdirSync(dir)) {
                if (f.startsWith(base + '.parte')) fs.rmSync(path.join(dir, f), { force: true });
            }
        }
    }
};
