import yts from 'yt-search';
import axios from 'axios';
import config from '#config';

const cleanText = (text: any): string => {
    if (!text) return '';
    if (typeof text === 'string') return text.trim();
    return String(text).trim();
};

const formatViews = (v: number) =>
    v >= 1e9? (v / 1e9).toFixed(1) + 'B' :
    v >= 1e6? (v / 1e6).toFixed(1) + 'M' :
    v >= 1e3? (v / 1e3).toFixed(1) + 'K' : String(v);

const parseDuration = (s: string) => {
    if (!s) return 0;
    const p = s.split(':').map(Number);
    return p.length === 3? p[0]*3600 + p[1]*60 + p[2] : p.length === 2? p[0]*60 + p[1] : p[0]||0;
};

const extractUrl = (d: any) => {
    const c = d?.data?.download || d?.download || d?.dl || d?.data?.dl_url || d?.data?.download?.url || d?.result?.download || d?.result?.url || d?.url || d?.link || d?.datos?.url;
    return typeof c === 'string' && c.startsWith('http')? c : '';
};

const tryFetch = (url: string) => axios.get(url, { timeout: 12000, headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => {
    const dl = extractUrl(r.data);
    if (!dl) throw new Error();
    return dl;
});

const getAudio = async (videoUrl: string, heavy: boolean) => {
    const enc = encodeURIComponent(videoUrl);
    const ryuzei = [
        `https://api.ryuzei.xyz/download/ytmp3/v4?url=${enc}&quality=64`,
        `https://api.ryuzei.xyz/download/ytmp3/v3?url=${enc}&quality=64`
    ];
    const backup = [
        `https://api.delirius.online/download/ytmp3?url=${enc}`,
        `https://api.starlights.uk/api/download/ytmp3?url=${enc}`,
        `https://api.starlights.uk/api/download/ytmp3v2?url=${enc}`
    ];
    const list = heavy? backup : [...ryuzei,...backup];
    for (const api of list) {
        try { return await tryFetch(api); } catch {}
    }
    throw new Error('fail');
};

export default {
    command: ['play', 'audio'],
    description: 'Play directo yt',
    category: 'download',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;
        const query = args.join(" ").trim();
        if (!query) return sock.sendMessage(chat, { text: `ꕤ Ingresa nombre o link` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: "🎧", key: msg.key } });

            const m = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
            const searchQ = m? `https://youtu.be/${m[1]}` : query;

            const search = await yts(searchQ);
            if (!search?.videos?.length) {
                await sock.sendMessage(chat, { react: { text: "❌", key: msg.key } });
                return sock.sendMessage(chat, { text: `No encontré nada para ${query}` }, { quoted: msg });
            }

            const video = search.videos[0];
            const videoId = video.videoId;
            const videoUrl = `https://youtu.be/${videoId}`;
            const title = cleanText(video.title);
            const channel = cleanText(video.author?.name);
            const views = typeof video.views === 'number'? video.views : 0;
            const durationStr = cleanText(video.timestamp);
            const isHeavy = parseDuration(durationStr) > 600;

            await sock.sendMessage(chat, {
                image: { url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` },
                caption: `*${title}*\n\n✿ Canal » ${channel}\n✿ Vistas » ${formatViews(views)}\n✿ Duración » ${durationStr}\n✿ Link » ${videoUrl}\n\n_Enviando audio..._`
            }, { quoted: msg });

            const dlUrl = await getAudio(videoUrl, isHeavy);

            await sock.sendMessage(chat, {
                audio: { url: dlUrl },
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`,
                ptt: false
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: "✅", key: msg.key } });

        } catch (e: any) {
            console.log('[PLAY]', e?.message);
            await sock.sendMessage(chat, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(chat, { text: `❌ Error al descargar, intenta de nuevo` }, { quoted: msg });
        }
    }
};
