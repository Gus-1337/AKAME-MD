import axios from 'axios';
import yts from 'yt-search';
import config from '#config';

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const MIN_BYTES = 50 * 1024;         // menos de 50 KB = respuesta basura

const YT_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/;

const yosoyyo = () => (global as any).APIs?.yosoyyo || { url: 'https://api-yosoyyo-api-ofc.onrender.com', key: null };

/** Saca el primer enlace http que encuentre en la respuesta de una API. */
const extraerLink = (d: any): string => {
    const candidatos = [
        d?.data?.download, d?.download, d?.result?.download, d?.result?.url, d?.result?.download_url,
        d?.resultado?.download_url, d?.data?.url, d?.url, d?.link, d?.result?.link
    ];
    for (const c of candidatos) {
        if (typeof c === 'string' && c.startsWith('http')) return c;
        if (typeof c?.url === 'string' && c.url.startsWith('http')) return c.url;
    }
    return '';
};

/** Descarga el video completo a memoria y valida que sea video real. */
const descargar = async (url: string): Promise<Buffer> => {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 90000,
        maxContentLength: MAX_BYTES,
        maxBodyLength: MAX_BYTES,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const buf = Buffer.from(res.data);
    if (buf.length < MIN_BYTES) throw new Error('archivo muy pequeño');
    const tipo = String(res.headers['content-type'] || '');
    if (tipo.includes('text/html') || tipo.includes('application/json')) throw new Error('no es video');
    return buf;
};

const sources = (videoUrl: string) => {
    const e = encodeURIComponent(videoUrl);
    const key = yosoyyo().key;
    return {
        principales: [
            `https://api.delirius.online/download/ytmp4?url=${e}`,
            `https://api.starlights.uk/api/download/ytmp4?url=${e}`
        ],
        respaldo: key
            ? `${yosoyyo().url}/api/youtube/v2?url=${e}&format=mp4&apiKey=${encodeURIComponent(key)}`
            : null
    };
};

/** Pide el enlace a una API y descarga el video. */
const intentar = async (api: string): Promise<Buffer> => {
    const { data } = await axios.get(api, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const link = extraerLink(data);
    if (!link) throw new Error('sin enlace');
    return descargar(link);
};

/** Principales en paralelo; si fallan, respaldo yosoyyo. Dos rondas. */
const getVideo = async (videoUrl: string): Promise<Buffer> => {
    const { principales, respaldo } = sources(videoUrl);
    let ultimo: any = null;
    for (let ronda = 1; ronda <= 2; ronda++) {
        try {
            return await Promise.any(principales.map(intentar));
        } catch (e) { ultimo = e; }
        if (respaldo) {
            try {
                return await intentar(respaldo);
            } catch (e) { ultimo = e; }
        }
    }
    throw new Error(`todas las APIs fallaron: ${ultimo?.message || ''}`);
};

export default {
    command: ['ytmp4', 'video', 'ytv'],
    description: 'Descarga video de YouTube (link o nombre)',
    category: 'download',
    group: true,
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const p = ctx.usedPrefix || ctx.prefix || config.prefix || '.';
        const query = args.join(' ').trim();
        if (!query) return sock.sendMessage(chat, { text: `Usa: ${p}ytmp4 <link o nombre>` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: '🎬', key: msg.key } });

            // Si no es link, busca el primer resultado
            let videoUrl = query;
            const m = query.match(YT_REGEX);
            if (m) {
                videoUrl = `https://youtu.be/${m[1]}`;
            } else {
                const s = await yts(query);
                const v = s.videos?.[0];
                if (!v) throw new Error('sin resultados');
                videoUrl = `https://youtu.be/${v.videoId}`;
            }

            const buffer = await getVideo(videoUrl);
            const sizeMB = buffer.length / (1024 * 1024);

            if (sizeMB > 60) {
                await sock.sendMessage(chat, {
                    document: buffer,
                    mimetype: 'video/mp4',
                    fileName: `yt-${Date.now()}.mp4`,
                    caption: `🎬 Listo - ${sizeMB.toFixed(2)} MB (documento por peso)`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chat, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    caption: '🎬 Listo'
                }, { quoted: msg });
            }

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });
        } catch (e) {
            console.log('[YTMP4 ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: 'ෆ⁠╹⁠ lo siento ocurrido algo al descargar ෆ⁠╹⁠' }, { quoted: msg });
        }
    }
};
