import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import { descargarArchivo, mb, type Info } from '../../lib/descarga.ts';

// Películas completas desde Internet Archive (archive.org).
const IA = 'https://archive.org';
const LIMITE_PELI = 700 * 1024 * 1024; // 700 MB (límite interno, no se muestra al usuario)
const MIME_VIDEO = 'video/mp4';
const MAX_RESULTADOS = 10;
const MIN_MINUTOS = 40; // por debajo de esto se considera corto, no película
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

// Tráilers, clips y extras: se descartan para mostrar solo películas completas
const NO_PELICULA = /trailer|tráiler|clip|promo|teaser|preview|sample|excerpt|bonus|recap|review|making of|behind the scenes|scene|intro|opening|highlights|resumen|episode|episodio|\bep\.?\s?\d|season|temporada|commercial|comercial|\bads?\b|beer|news|noticias|show|serie|capitulo|cap\.?\s?\d/i;

type Peli = { id: string; titulo: string; anio: string };

/** Portada de la película desde Internet Archive. */
const portada = (id: string) => `${IA}/services/img/${encodeURIComponent(id)}`;

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

const limpiarNombre = (n: string) => String(n || 'pelicula').replace(/[\\/:*?"<>|]/g, '').trim() || 'pelicula';

/** Duración en minutos a partir de lo que devuelve Internet Archive ("98", "01:37:00", "98 min"). */
function minutosDe(v: any): number | null {
    if (v === undefined || v === null || v === '') return null;
    const s = String(v).trim();
    const hms = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
    if (hms) return Number(hms[1]) * 60 + Number(hms[2]) + (Number(hms[3] || 0) / 60);
    const n = parseFloat(s.replace(',', '.'));
    if (isNaN(n)) return null;
    // Números enteros grandes suelen ser segundos
    return n > 600 ? n / 60 : n;
}

/** Busca películas completas por título en Internet Archive. */
async function buscarPelis(q: string): Promise<Peli[]> {
    const limpio = q.replace(/["()]/g, ' ').replace(/\s+/g, ' ').trim();
    const { data } = await axios.get(`${IA}/advancedsearch.php`, {
        params: {
            q: `title:(${limpio}) AND collection:(feature_films)`,
            'fl[]': ['identifier', 'title', 'year', 'runtime'],
            rows: 40,
            output: 'json'
        },
        timeout: 25000,
        headers: UA
    });
    const pelis: Peli[] = [];
    for (const d of data?.response?.docs || []) {
        const titulo = String(d.title || d.identifier);
        if (NO_PELICULA.test(titulo)) continue;
        // Si Internet Archive trae la duración y es corta, se descarta; si no la trae, la colección ya son largometrajes
        const min = minutosDe(d.runtime);
        if (min !== null && min < MIN_MINUTOS) continue;
        pelis.push({ id: String(d.identifier), titulo: titulo.slice(0, 80), anio: d.year ? String(d.year) : '?' });
        if (pelis.length >= MAX_RESULTADOS) break;
    }
    return pelis;
}

/** Elige el MP4 más pesado que quepa en el límite interno. */
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
        description: `🎞️ ${p.anio} • Película completa`.slice(0, 72),
        id: `${usedPrefix}movie id:${p.id}`
    }));

    const cuerpo = [
        '🍿 *PELÍCULAS COMPLETAS*',
        '───────────────',
        `✧ Búsqueda » *${q}*`,
        `✦ Resultados » *${pelis.length}*`,
        '───────────────',
        'Elige la que quieres ver 🎬'
    ].join('\n');

    let header: any = undefined;
    try {
        const media = await prepareWAMessageMedia({ image: { url: portada(pelis[0].id) } }, { upload: sock.waUploadToServer });
        header = { hasMediaAttachment: true, imageMessage: media.imageMessage };
    } catch { header = undefined; }

    const opciones: any = quoted?.message ? { quoted } : {};
    const list = generateWAMessageFromContent(chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    body: { text: cuerpo },
                    footer: { text: 'AKAME MD • Películas' },
                    ...(header ? { header } : {}),
                    nativeFlowMessage: {
                        buttons: [{
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: 'Ver películas',
                                sections: [{ title: '🎬 RESULTADOS', highlight_label: 'HD', rows }]
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
                text: caja('MOVIE', ['✧ No pude preparar esa película.', '✦ Elige otra de la lista.'])
            }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
            return;
        }

        const info: Info = { nombre: archivo.nombre, link: archivo.link, tamano: archivo.tamano, mime: MIME_VIDEO };
        await descargarArchivo(info, destino, LIMITE_PELI);
        const real = fs.statSync(destino).size;

        const titulo = limpiarNombre(archivo.titulo);
        try {
            await sock.sendMessage(chat, {
                image: { url: portada(id) },
                caption: caja('MOVIE', [`🎬 *${titulo}*`, '✦ Enviando la película, espera un momento 🍿'])
            }, { quoted: m });
        } catch { /* si no hay portada, se sigue con el archivo */ }
        await sock.sendMessage(chat, {
            document: { stream: fs.createReadStream(destino) },
            mimetype: MIME_VIDEO,
            fileName: `${titulo}.mp4`,
            caption: caja('MOVIE', [
                `🎬 *${titulo}*`,
                `✦ Peso » *${mb(real)}*`,
                '',
                'Disfruta la película 🍿'
            ])
        }, { quoted: m });
        await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
    } catch (e: any) {
        console.error('[MOVIE ERROR]', e?.message);
        const msg = String(e?.message || '');
        const texto = msg.includes('más de')
            ? caja('MOVIE', ['✧ Esa película es muy pesada para enviarla.', '✦ Elige otra de la lista.'])
            : caja('MOVIE', ['✧ No pude descargar esa película.', '✦ Prueba otra vez o elige otra.']);
        await sock.sendMessage(chat, { text: texto }, { quoted: m });
        await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
    } finally {
        limpiar(destino);
    }
}

export default {
    command: ['movie', 'pelicula', 'peli'],
    description: 'Busca películas completas y elige cuál ver',
    category: 'download',

    run: async (ctx: any): Promise<void> => {
        const { sock, chat, args, usedPrefix } = ctx;
        const m = ctx.m ?? ctx.msg;

        if (!args?.[0]) {
            await sock.sendMessage(chat, {
                text: caja('MOVIE', [
                    `✧ Usa *${usedPrefix}movie nombre de la película*`,
                    `✦ Ejemplo: *${usedPrefix}movie night of the living dead*`
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
            await sock.sendMessage(chat, { text: caja('MOVIE', [`✧ No encontré *${q}* en películas completas.`, '✦ Prueba con otro nombre.']) }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
            return;
        }

        await enviarLista(sock, chat, m, usedPrefix, q, pelis);
        await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
    }
};
