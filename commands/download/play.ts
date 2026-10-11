import yts from 'yt-search';
import axios from 'axios';

const formatViews = (v) =>
    v >= 1e9? (v / 1e9).toFixed(1) + 'B' :
    v >= 1e6? (v / 1e6).toFixed(1) + 'M' :
    v >= 1e3? (v / 1e3).toFixed(1) + 'K' : String(v);

const extractUrl = (d) => {
    return d?.resultado?.download_url || d?.result?.download_url || d?.data?.download || d?.result?.download || d?.url || '';
};

const tryFetch = (url) => axios.get(url, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }).then(r => {
    const dl = extractUrl(r.data);
    if (!dl) throw new Error();
    return dl;
});

const getAudio = async (videoUrl) => {
    const enc = encodeURIComponent(videoUrl);

    const apis = [
        `https://api-gohan-v1.onrender.com/download/ytaudio?url=${enc}`,
        `https://api-gohan-v1.onrender.com/download/ytaudio?url=${enc}&download=true`,
        `https://api.ryuzei.xyz/download/ytmp3/v4?url=${enc}&quality=64`,
        `https://api.delirius.online/download/ytmp3?url=${enc}`
    ];

    for (const api of apis) {
        try { return await tryFetch(api); } catch {}
    }
    throw new Error('fail');
};

export default {
    command: ['play', 'audio'],
    category: 'download',
    group: true,
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const query = args.join(" ").trim();
        if (!query) return sock.sendMessage(chat, { text: `ꕤ Ingresa nombre o link` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: "🎧", key: msg.key } });

            const search = await yts(query);
            const video = search.videos[0];
            const videoUrl = `https://youtu.be/${video.videoId}`;

            await sock.sendMessage(chat, {
                image: { url: video.thumbnail },
                caption: `*${video.title}*\n\n✿ Canal » ${video.author.name}\n✿ Vistas » ${formatViews(video.views)}\n✿ Duración » ${video.timestamp}\n✿ Link » ${videoUrl}\n\n_Enviando audio..._`
            }, { quoted: msg });

            const dlUrl = await getAudio(videoUrl);

            await sock.sendMessage(chat, {
                audio: { url: dlUrl },
                mimetype: "audio/mpeg",
                fileName: `${video.title}.mp3`,
                ptt: false
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            await sock.sendMessage(chat, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(chat, { text: `❌ Error al descargar` }, { quoted: msg });
        }
    }
};
