import yts from 'yt-search';
import axios from 'axios';

const formatViews = (v: number) => 
    v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : 
    v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : 
    v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v);

const extractDownloadUrl = (data: any): string => {
    const candidate = data?.data?.download || data?.download || data?.dl || data?.data?.dl_url || 
                      data?.data?.download?.url || data?.datos?.url || data?.result?.download || 
                      data?.result?.dl || data?.result?.url || data?.result?.link || 
                      data?.data?.dl || data?.data?.url || data?.data?.link || 
                      (typeof data?.download === 'object' ? data?.download?.url || data?.download?.link : null) || 
                      data?.url || data?.link;
    return (typeof candidate === 'string' && candidate.startsWith('http')) ? candidate : '';
};

const fetchApiUrl = (apiUrl: string): Promise<string> => {
    return axios.get(apiUrl, { timeout: 0, headers: { 'User-Agent': 'Mozilla/5.0' } }).then(res => {
        const dlUrl = extractDownloadUrl(res.data);
        if (!dlUrl) throw new Error('Sin URL');
        return dlUrl;
    });
};

const getAudioUrlWithRetry = (videoUrl: string): Promise<string> => {
    const encoded = encodeURIComponent(videoUrl);
    const apis = [
        `https://api.delirius.online/download/ytmp3?url=${encoded}`,
        `https://api.starlights.uk/api/download/ytmp3?url=${encoded}`,
        `https://api.starlights.uk/api/download/ytmp3v2?url=${encoded}`
    ];
    return fetchApiUrl(apis[0]).catch(() => fetchApiUrl(apis[1])).catch(() => fetchApiUrl(apis[2]));
};

export default {
    command: ['playaudio'],
    description: 'Descarga audio rápido',
    category: 'download',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;
        const query = args.join(" ").trim();
        
        if (!query) return sock.sendMessage(chat, { text: `🎧 Uso: .playaudio bad bunny` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: "🎧", key: msg.key } });

            let videoUrl = query;
            let videoInfo: any = null;
            
            if (!query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/)) {
                const search = await yts(query);
                if (!search?.videos?.length) {
                    await sock.sendMessage(chat, { react: { text: "❌", key: msg.key } });
                    return sock.sendMessage(chat, { text: `❌ No se encontró nada` }, { quoted: msg });
                }
                const video = search.videos[0];
                videoUrl = `https://youtu.be/${video.videoId}`;
                videoInfo = video;
                
                const caption = `╭━━━〔 *🎧 AKAME AUDIO* 〕━━━⬣
┃ 📌 *Título:* ${video.title}
┃ 👤 *Canal:* ${video.author?.name || 'Desconocido'}
┃ 👁️ *Vistas:* ${formatViews(video.views)}
┃ ⏱️ *Duración:* ${video.timestamp}
┃ 🔗 *Link:* ${videoUrl}
╰━━━━━━━━━━━━━━━━━━⬣

> _Descargando audio..._`;

                await sock.sendMessage(chat, { 
                    image: { url: video.thumbnail },
                    caption: caption 
                }, { quoted: msg });
            }

            const downloadUrl = await getAudioUrlWithRetry(videoUrl);
            
            await sock.sendMessage(chat, { 
                audio: { url: downloadUrl }, 
                mimetype: "audio/mpeg", 
                fileName: `${videoInfo?.title || 'audio'}.mp3`,
            }, { quoted: msg });
            
            await sock.sendMessage(chat, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(chat, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(chat, { text: `❌ Error al descargar` }, { quoted: msg });
        }
    }
};
