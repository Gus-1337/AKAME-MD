import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { generateWAMessageFromContent } from '@whiskeysockets/baileys';
import { descargarArchivo, mb, type Info } from '../../lib/descarga.ts';

// Películas de dominio público o con licencia libre, desde Internet Archive (archive.org).
const IA = 'https://archive.org';
const LIMITE_PELI = 1024 * 1024 * 1024; // 1 GB
const MIME_VIDEO = 'video/mp4';
const MAX_RESULTADOS = 10;
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

type Peli = { id: string; titulo: string; anio: string };

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

const limpiarNombre = (n: string) => String(n || 'pelicula').replace(/[\\/:*?"<>|]/g, '').trim() || 'pelicula';

/** Busca películas por título en Internet Archive. */
async function buscarPelis(q: string): Promise<Peli[]> {
    const limpio = q.replace(/["()]/g, ' ').replace(/\s+/g, ' ').trim();
    const { data } = await axios.get(`${IA}/advancedsearch.php`, {
        params: {
            q: `title:(${limpio}) AND mediatype:movies`,
            'fl[]': ['identifier', 'title', 'year'],
            rows: MAX_RESULTADOS,
            output: 'json'
        },
        timeout: 25000,
        headers: UA
    });
    return (data?.response?.docs || []).map((d: any) => ({
        id: String(d.identifier),
        titulo: String(d.title || d.identifier).slice(0, 80),
        anio: d.year ? String(d.year) : '?'
    }));
}

/** Elige el MP4 más pesado que no pase de 1 GB. */
async function archivoDe(id: string): Promise<{ nombre: string; tamano: number; link: string; titulo: string } | null> {
    const { data } = await axios.get(`${IA}/metadata/${encodeURIComponent(id)}`, { timeout: 25000, headers: UA });
    const candidatos = (data?.files || [])
        .filter((f: any) => /\.(mp4|m4v)$/i.test(f.name) && Number(f.size) > 0 && Number(f.size) <= LIMITE_PELI)
        .sort((a: any, b: any) => Number(b.size) - Number(a.size));
    const f = candidatos[0];
    if (!f) return null;
    return {
        nombre: String(f.name),
        tamano: Number(f.size),
        link: `${IA}/download/${encodeURIComponent(id)}/${encodeURIComponent(f.name)}`,
        titulo: String(data?.metadata?.title || id)
    };
}

/** Borra el temporal y cualquier parte que haya quedado a medias. */
function limpiar(destino: string) {
    fs.rmSync(destino, { force: true });
    const dir = path.dirname(destino);
    const base = path.basename(destino);
    for (const f of fs.readdirSync(dir)) {
        if (f.startsWith(base + '.parte')) fs.rmSync(path.join(dir, f), { force: true });
    }
}

/** Manda la lista de películas con selección única. */
async function enviarLista(sock: any, chat: string, quoted: any, usedPrefix: string, q: string, pelis: Peli[]) {
    const rows = pelis.map((p) => ({
        title: p.titulo.slice(0, 40),
        description: `Año ${p.anio} • Dominio público`.slice(0, 72),
        id: `${usedPrefix}movie id:${p.id}`
    }));

    const cuerpo = caja('MOVIE', [
        `✧ Búsqueda » *${q}*`,
        `✦ Resultados » *${pelis.length}*`,
        '',
        'Elige la película que quieres ver 🎬'
    ]).replace(/\n> AKAME-MD 🌸$/, '');

    const opciones: any = quoted?.message ? { quoted } : {};
    const list = generateWAMessageFromContent(chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    body: { text: cuerpo },
                    footer: { text: 'AKAME MD • Dominio público (Internet Archive)' },
                    nativeFlowMessage: {
                        buttons: [{
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: 'Elegir película',
                                sections: [{ title: '🎬 PELÍCULAS', highlight_label: 'MOVIE', rows }]
                            })
                        }]
                    }
                }
            }
        }
    }, opciones);

    await sock.relayMessage(chat, list.message, { messageId: list.key.id });
}

/** Descarga la película elegida y la manda como documento. */
async function enviarPeli(sock: any, m: any, chat: string, id: string) {
    const destino = path.join(os.tmpdir(), `movie-${randomBytes(6).toString('hex')}`);
    try {
        await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });

        const archivo = await archivoDe(id);
        if (!archivo) {
            await sock.sendMessage(chat, {
                text: caja('MOVIE', ['✧ Esa película no tiene una versión de 1 GB o menos.', '✦ Elige otra.'])
            }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
            return;
        }

        const info: Info = { nombre: archivo.nombre, link: archivo.link, tamano: archivo.tamano, mime: MIME_VIDEO };
        await descargarArchivo(info, destino, LIMITE_PELI);
        const real = fs.statSync(destino).size;

        const titulo = limpiarNombre(archivo.titulo);
        await sock.sendMessage(chat, {
            document: { stream: fs.createReadStream(destino) },
            mimetype: MIME_VIDEO,
            fileName: `${titulo}.mp4`,
            caption: caja('MOVIE', [
                `✧ *${titulo}*`,
                `✦ Peso » *${mb(real)}*`,
                '',
                '🎬 Dominio público (Internet Archive)'
            ])
        }, { quoted: m });
        await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
    } catch (e: any) {
        console.error('[MOVIE ERROR]', e?.message);
        const msg = String(e?.message || '');
        const texto = msg.includes('más de')
            ? caja('MOVIE', ['✧ Esa película pesa más de 1 GB, no la puedo enviar.'])
            : caja('MOVIE', ['✧ No pude descargar esa película.', '✦ Prueba otra vez o elige otra.']);
        await sock.sendMessage(chat, { text: texto }, { quoted: m });
        await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
    } finally {
        limpiar(destino);
    }
}

export default {
    command: ['movie', 'pelicula', 'peli'],
    description: 'Busca películas de dominio público y elige cuál descargar (hasta 1 GB)',
    category: 'download',

    run: async (ctx: any): Promise<void> => {
        const { sock, chat, args, usedPrefix } = ctx;
        const m = ctx.m ?? ctx.msg;

        if (!args?.[0]) {
            await sock.sendMessage(chat, {
                text: caja('MOVIE', [
                    `✧ Usa *${usedPrefix}movie <nombre de la película>*`,
                    `✦ Ejemplo: *${usedPrefix}movie night of the living dead*`,
                    `✦ Solo películas de dominio público. Límite: *1 GB*`
                ])
            }, { quoted: m });
            return;
        }

        // Selección desde la lista: ".movie id:<identificador>"
        const sel = String(args[0]).match(/^id:([A-Za-z0-9._-]+)$/);
        if (sel) {
            await enviarPeli(sock, m, chat, sel[1]);
            return;
        }

        const q = args.join(' ').trim();
        await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });

        let pelis: Peli[] = [];
        try {
            pelis = await buscarPelis(q);
        } catch (e: any) {
            console.error('[MOVIE BUSQUEDA]', e?.message);
            await sock.sendMessage(chat, { text: caja('MOVIE', ['✧ No pude buscar ahora.', '✦ Prueba otra vez en un rato.']) }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
            return;
        }

        if (!pelis.length) {
            await sock.sendMessage(chat, { text: caja('MOVIE', [`✧ No encontré *${q}*.`, '✦ Prueba con otro nombre.']) }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
            return;
        }

        await enviarLista(sock, chat, m, usedPrefix, q, pelis);
        await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
    }
};
