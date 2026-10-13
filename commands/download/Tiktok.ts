import axios from 'axios';
import config from '#config';

const MAX_BYTES = 80 * 1024 * 1024; // 80 MB
const MIN_BYTES = 30 * 1024;        // menos de 30 KB = respuesta basura
const MAX_SEGUNDOS = 900;           // 15 min

/** Fuentes de TikTok en paralelo. Cada una: cómo armar la URL, cómo sacar el enlace del video y los datos. */
const FUENTES = [
    {
        nombre: 'delirius',
        url: (e: string) => `https://api.delirius.online/download/tiktok?url=${e}`,
        enlace: (d: any) => {
            const media = d?.data?.meta?.media?.[0];
            const c = (media?.hd && media.hd !== '0 B' ? media.hd : media?.org) || media?.wm;
            return typeof c === 'string' && c.startsWith('http') ? c : '';
        },
        datos: (d: any) => d?.data || {},
        segundos: (x: any) => Number(x?.duration) || 0
    },
    {
        nombre: 'starlights',
        url: (e: string) => `https://api.starlights.uk/api/download/tiktok?url=${e}`,
        enlace: (d: any) => {
            const c = d?.data?.download?.no_watermark_hd || d?.data?.download?.no_watermark;
            return typeof c === 'string' && c.startsWith('http') ? c : '';
        },
        datos: (d: any) => d?.data || {},
        // Starlights manda la duración en milisegundos
        segundos: (x: any) => (Number(x?.duration) || 0) / 1000
    },
    {
        nombre: 'stellar',
        url: (e: string) => `https://api.stellarwa.xyz/dl/tiktok?url=${e}&apikey=proyectsV2`,
        enlace: (d: any) => {
            const c = d?.data?.dl;
            return typeof c === 'string' && c.startsWith('http') ? c : '';
        },
        datos: (d: any) => d?.data || {},
        segundos: (x: any) => Number(x?.duration?.toString().split(':').reduce((a: number, t: string) => a * 60 + Number(t), 0)) || 0
    }
];

/** Valida que sea un MP4 real (firma 'ftyp'), no HTML ni JSON. */
const esVideo = (buf: Buffer) =>
    buf.length >= MIN_BYTES && buf.subarray(0, 32).indexOf('ftyp') !== -1;

const descargar = async (url: string): Promise<Buffer> => {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 45000,
        maxContentLength: MAX_BYTES,
        maxBodyLength: MAX_BYTES,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://www.tiktok.com/' }
    });
    const buf = Buffer.from(res.data);
    if (!esVideo(buf)) throw new Error('no es video');
    return buf;
};

/** Una fuente completa: pide el enlace, descarga el video y devuelve video + datos. */
const intentar = async (f: typeof FUENTES[number], e: string) => {
    const { data } = await axios.get(f.url(e), { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const link = f.enlace(data);
    if (!link) throw new Error(`${f.nombre}: sin enlace`);
    const buffer = await descargar(link);
    return { buffer, datos: f.datos(data), segundos: f.segundos(f.datos(data)), fuente: f.nombre };
};

/**
 * Orden de prueba:
 * 1) Delirius sola (es la más rápida). Si da 500, reintenta una vez.
 * 2) Si Delirius falla, Starlights y Stellar en paralelo.
 * 3) Una segunda vuelta completa si todo falló.
 */
const obtenerVideo = async (url: string) => {
    const e = encodeURIComponent(url);
    const delirius = FUENTES[0];
    const respaldos = FUENTES.slice(1);
    let ultimo: any = null;

    for (let ronda = 1; ronda <= 2; ronda++) {
        for (let intento = 1; intento <= 2; intento++) {
            try {
                return await intentar(delirius, e);
            } catch (err: any) {
                ultimo = err;
            }
        }
        try {
            return await Promise.any(respaldos.map((f) => intentar(f, e)));
        } catch (err: any) {
            ultimo = err;
        }
    }
    const primer = ultimo?.errors?.[0]?.message || ultimo?.message;
    throw new Error(`todas las fuentes fallaron${primer ? ': ' + primer : ''}`);
};

const formatNumber = (num: number) => {
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
};

export default {
    command: ['tiktok', 'tk', 'tt'],
    description: 'Descarga videos de TikTok sin marca',
    category: 'download',
    group: true,

    run: async ({ chat, m, sock, args }: any) => {
        const msgId = m?.id || m?.key?.id;

        try {
            const url = args.join(' ').trim();
            if (!url) {
                return sock.sendMessage(chat, {
                    text: `♡ AKAME-MD - TIKTOK ♡\n\n✿ Ingresa un link de TikTok bb\n\nEjemplo: *.tiktok https://vm.tiktok.com/ZMh8nTB9b/*`
                }, { quoted: m });
            }

            const tiktokRegex = /(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)/i;
            if (!tiktokRegex.test(url)) {
                return sock.sendMessage(chat, { text: `✿ Ese no es un link de TikTok válido bb ✿` }, { quoted: m });
            }

            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'search_started', url });

            const { buffer, datos, segundos, fuente } = await obtenerVideo(url);

            if (segundos > MAX_SEGUNDOS) {
                await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
                return sock.sendMessage(chat, { text: `✿ El video es muy largo (+15 min) bb, no puedo descargarlo ✿` }, { quoted: m });
            }

            const title = String(datos.title || 'Sin título').trim();
            const author = datos.author?.nickname || datos.author?.name || datos.nickname || 'Desconocido';
            const rawUsername = String(datos.author?.username || datos.author?.unique_id || datos.unique_id || 'desconocido');
            const username = rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername;
            const rawLikes = datos.like ?? datos.digg_count ?? datos.stats?.diggCount ?? 0;
            const likes = typeof rawLikes === 'number' ? rawLikes : parseInt(String(rawLikes).replace(/\D/g, '')) || 0;
            const musicTitle = datos.music?.title || datos.music_info?.title || 'Sin música';
            const musicAuthor = datos.music?.author || datos.music_info?.author || 'Desconocido';
            const duracion = segundos ? `${Math.round(segundos)}s` : '-';

            const devName = config.devName || 'AKAME-MD';
            const caption = `♡ AKAME-MD - TIKTOK DL ♡

✿ *Título:* ${title}
✿ *Autor:* ${author} (@${username})
✿ *Likes:* ${formatNumber(likes)}
✿ *Duración:* ${duracion}
✿ *Música:* ${musicTitle} - ${musicAuthor}

✿ Made by *${devName}* ♡`.trim();

            global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_video', fuente });

            await sock.sendMessage(chat, {
                video: buffer,
                mimetype: 'video/mp4',
                caption,
                gifPlayback: false
            }, { quoted: m });

            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });

        } catch (error: any) {
            console.error('[TIKTOK ERROR]', error?.message);
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: error?.message });
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
            return sock.sendMessage(chat, {
                text: `✿ Error al descargar el tiktok bb, intenta de nuevo\n> ${error?.message || ''}`
            }, { quoted: m });
        }
    }
};

// Bye Gus
