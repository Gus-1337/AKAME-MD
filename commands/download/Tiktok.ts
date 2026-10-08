import { PassThrough } from 'node:stream';
import axios from 'axios';
import config from '#config';

const extractVideoUrl = (data: any): string | null => {
    const media = data?.data?.meta?.media?.[0] || data?.meta?.media?.[0];
    if (media) {
        const candidate = media.hd && media.hd!== '0 B'? media.hd : media.org || media.wm;
        if (candidate && candidate.startsWith('http')) return candidate;
    }
    const rawUrl = data?.data?.play || data?.play || data?.url || data?.data?.url;
    return typeof rawUrl === 'string' && rawUrl.startsWith('http')? rawUrl : null;
};

const fetchTikTokData = async (url: string) => {
    const encoded = encodeURIComponent(url);
    const apis = [
        `https://api.delirius.online/download/tiktok?url=${encoded}`,
        `https://api.starlights.uk/api/download/tiktok?url=${encoded}`
    ];

    const promises = apis.map(async (apiUrl) => {
        const res = await axios.get(apiUrl, {
            timeout: 8000,
            headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 7)' }
        });
        if (!res.data) throw new Error('Sin datos');
        return res.data;
    });

    return await Promise.any(promises);
};

const getVideoStream = async (videoUrl: string): Promise<PassThrough> => {
    const res = await axios.get(videoUrl, {
        responseType: 'stream',
        timeout: 15000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const passThrough = new PassThrough();
    res.data.pipe(passThrough);
    return passThrough;
};

export default {
    command: ['tiktok', 'tt', 'tk'],
    description: 'Descarga videos de TikTok sin marca',
    category: 'download',
    group: true,

    run: async ({ chat, m, sock, args }: any) => {
        const msgId = m?.id || m?.key?.id;

        try {
            const url = args.join(' ').trim();
            if (!url) {
                return sock.sendMessage(chat, {
                    text: `♡ AKAME-MD - TIKTOK ♡\n\n✿ Ingresa un link de TikTok bb\n\nEjemplo: *.tt https://vm.tiktok.com/ZMh8nTB9b/*`
                }, { quoted: m });
            }

            const tiktokRegex = /(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)/i;
            if (!tiktokRegex.test(url)) {
                return sock.sendMessage(chat, {
                    text: `✿ Ese no es un link de TikTok válido bb ✿`
                }, { quoted: m });
            }

            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'search_started', url });

            const responseData = await fetchTikTokData(url);
            const data = responseData?.data || responseData;

            const videoUrl = extractVideoUrl(responseData);
            if (!videoUrl) {
                global.broadcast?.('cmd_progress', { id: msgId, step: 'no_results', url });
                return sock.sendMessage(chat, {
                    text: `✿ No pude obtener el video bb, verifica el link ✿`
                }, { quoted: m });
            }

            const duration = data.duration || data.meta?.duration || 0;
            if (duration > 900) {
                return sock.sendMessage(chat, {
                    text: `✿ El video es muy largo (+15 min) bb, no puedo descargarlo ✿`
                }, { quoted: m });
            }

            const title = (data.title || 'Sin título').trim();
            const author = data.author?.nickname || 'Desconocido';
            const rawUsername = data.author?.username || 'desconocido';
            const username = rawUsername.startsWith('@')? rawUsername.slice(1) : rawUsername;
            const rawLikes = data.like || data.digg_count || 0;
            const likes = typeof rawLikes === 'number'? rawLikes : parseInt(String(rawLikes).replace(/\D/g, '')) || 0;
            const musicTitle = data.music?.title || data.music_info?.title || 'Sin música';
            const musicAuthor = data.music?.author || data.music_info?.author || 'Desconocido';

            const formatNumber = (num: number) => {
                if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
                if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
                return num.toString();
            };

            const devName = config.devName || 'AKAME-MD';
            const caption = `♡ AKAME-MD - TIKTOK DL ♡

✿ *Título:* ${title}
✿ *Autor:* ${author} (@${username})
✿ *Likes:* ${formatNumber(likes)}
✿ *Duración:* ${duration}s
✿ *Música:* ${musicTitle} - ${musicAuthor}

✿ Made by *${devName}* ♡`.trim();

            global.broadcast?.('cmd_progress', { id: msgId, step: 'downloading_video' });
            const videoStream = await getVideoStream(videoUrl);

            global.broadcast?.('cmd_progress', { id: msgId, step: 'sending_video' });

            await sock.sendMessage(chat, {
                video: { stream: videoStream },
                caption,
                gifPlayback: false
            }, { quoted: m });

            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });

        } catch (error: any) {
            console.error(error);
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: error.message });
            return sock.sendMessage(chat, {
                text: `✿ Error al descargar el tiktok bb\n> ${error.message}`
            }, { quoted: m });
        }
    }
};

// Bye Gus
