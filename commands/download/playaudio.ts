import yts from 'yt-search';
import axios from 'axios';
import { stellarUrl } from '../../lib/stellar.ts';

const MAX_BYTES = 400 * 1024 * 1024;
const TIMEOUT_DESCARGA = 120000;
const UA = { 'User-Agent': 'Mozilla/5.0' };
const YT_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/;

const formatViews = (v: number) =>
    v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' :
    v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' :
    v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v || 0);

/** Saca el enlace de descarga de cualquier respuesta conocida. */
const extraerLink = (d: any): string => {
    const candidatos = [
        d?.data?.download, d?.data?.dl, d?.download, d?.dl, d?.data?.dl_url, d?.data?.url,
        d?.data?.download?.url, d?.result?.download, d?.result?.dl, d?.result?.url, d?.result?.link,
        d?.result?.download_url, d?.resultado?.download_url, d?.datos?.url, d?.url, d?.link
    ];
    for (const c of candidatos) {
        if (typeof c === 'string' && c.startsWith('http')) return c;
        if (typeof c?.url === 'string' && c.url.startsWith('http')) return c.url;
    }
    return '';
};

/** Revisa que lo descargado sea audio real (no una página de error) y dice qué formato es. */
const detectar = (buf: Buffer): { mime: string; ext: string } | null => {
    if (buf.length < 20000) return null;
    if (buf.subarray(0, 3).toString() === 'ID3') return { mime: 'audio/mpeg', ext: 'mp3' };
    if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) return { mime: 'audio/mpeg', ext: 'mp3' };
    if (buf.subarray(0, 32).indexOf('ftyp') !== -1) return { mime: 'audio/mp4', ext: 'm4a' };
    return null;
};

const bajarAudio = async (url: string): Promise<{ buf: Buffer; mime: string; ext: string }> => {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT_DESCARGA,
        maxContentLength: MAX_BYTES,
        maxBodyLength: MAX_BYTES,
        headers: UA
    });
    const buf = Buffer.from(res.data);
    const formato = detectar(buf);
    if (!formato) throw new Error('no es audio');
    return { buf, ...formato };
};

/** Pide el enlace a una fuente y descarga el audio. */
const intentar = async (api: string) => {
    const { data } = await axios.get(api, { timeout: 45000, headers: UA });
    const link = extraerLink(data);
    if (!link) throw new Error('sin enlace');
    return bajarAudio(link);
};

/** Todas las fuentes a la vez: gana la primera que entregue audio válido. Dos rondas. */
const obtenerAudio = async (videoUrl: string) => {
    const e = encodeURIComponent(videoUrl);
    const fuentes = [
        `https://api.delirius.online/download/ytmp3?url=${e}`,
        stellarUrl('/dl/ytmp3', { url: videoUrl }),
        `https://api.starlights.uk/api/download/ytmp3?url=${e}`,
        `https://api.starlights.uk/api/download/ytmp3v2?url=${e}`,
        `https://api.ryuzei.xyz/download/ytmp3/v4?url=${e}&quality=64`,
        `https://api-gohan-v1.onrender.com/download/ytaudio?url=${e}&download=true`
    ];
    let ultimo: any = null;
    for (let ronda = 1; ronda <= 2; ronda++) {
        try {
            return await Promise.any(fuentes.map(intentar));
        } catch (err) { ultimo = err; }
    }
    throw ultimo || new Error('sin audio');
};

const limpiarNombre = (t: string) => (t || 'audio').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'audio';

const tarjeta = (v: any) =>
    '╭─────────────────╮\n' +
    '   🎧 *AKAME AUDIO* 🎧\n' +
    '╰─────────────────╯\n\n' +
    `✧ *Título:* ${v.title}\n` +
    `✦ *Canal:* ${v.author?.name || 'Desconocido'}\n` +
    `✦ *Duración:* ${v.timestamp || '—'}\n` +
    `✦ *Vistas:* ${formatViews(v.views)}\n\n` +
    '_Enviando tu audio, espera un momento..._ 🌸';

export default {
    command: ['playaudio'],
    description: 'Descarga audio rápido',
    category: 'download',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;
        const query = (args || []).join(' ').trim();
        const p = ctx.usedPrefix || '.';

        if (!query) {
            return sock.sendMessage(chat, {
                text: `╭─────────────────╮\n   🎧 *AKAME AUDIO* 🎧\n╰─────────────────╯\n\n✿ Usa: *${p}playaudio <nombre o link>*\n✿ Ejemplo: *${p}playaudio bad bunny*`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '🎧', key: msg.key } }).catch(() => null);

            let videoUrl = query;
            let info: any = null;

            if (!YT_REGEX.test(query)) {
                const search = await yts(query);
                const video = search?.videos?.[0];
                if (!video) {
                    await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
                    return sock.sendMessage(chat, { text: `❌ No encontré resultados para *${query}*` }, { quoted: msg });
                }
                info = video;
                videoUrl = `https://youtu.be/${video.videoId}`;
            }

            // La descarga arranca ya; mientras tanto se manda la tarjeta
            const descarga = obtenerAudio(videoUrl);
            descarga.catch(() => null);

            if (info) {
                await sock.sendMessage(chat, { image: { url: info.thumbnail }, caption: tarjeta(info) }, { quoted: msg })
                    .catch(() => sock.sendMessage(chat, { text: tarjeta(info) }, { quoted: msg }).catch(() => null));
            }

            const { buf, mime, ext } = await descarga;
            const titulo = limpiarNombre(info?.title || 'audio');

            await sock.sendMessage(chat, {
                audio: buf,
                mimetype: mime,
                fileName: `${titulo}.${ext}`
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch (e: any) {
            console.log('[PLAYAUDIO ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, {
                text: '✿ No pude descargar ese audio. Prueba con otro nombre o link.'
            }, { quoted: msg });
        }
    }
};
