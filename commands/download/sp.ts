import axios from 'axios';
import config from '#config';

const cleanText = (text: any): string => {
    if (!text) return '';
    if (typeof text === 'string') return text.trim();
    return String(text).trim();
};

const emitProgress = (msgId: string, step: string, extraData: Record<string, any> = {}) => {
    queueMicrotask(() => {
        global.broadcast?.('cmd_progress', { id: msgId, step, ...extraData });
    });
};

export default {
    command: ['sp', 'spotify'],
    description: 'Descarga música de Spotify',
    category: 'download',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;
        const msgId = msg?.id || msg?.key?.id;
        const query = args.join(" ").trim();
        
        if (!query) return sock.sendMessage(chat, { text: `ꕤ *Ingresa el título o enlace de Spotify*` }, { quoted: msg });

        const apiUrl = (config as any).api?.url || (global as any).api?.url || 'https://api.stellarwa.xyz';
        const apiKey = (config as any).api?.key || (global as any).api?.key || 'proyectsV2';

        try {
            await sock.sendMessage(chat, { react: { text: "🔍", key: msg.key } });
            emitProgress(msgId, 'search_started', { query });

            let url, songInfo: any;
            const isUrl = /open\.spotify\.com\/track\//i.test(query);

            if (isUrl) {
                url = query;
                const res = await axios.get(`${apiUrl}/dl/spotify?url=${encodeURIComponent(url)}&key=${apiKey}`, { timeout: 0 });
                if (!res.data?.status) throw new Error('No se pudo procesar el enlace');
                songInfo = res.data.data;
            } else {
                const searchRes = await axios.get(`${apiUrl}/search/spotify?query=${encodeURIComponent(query)}&key=${apiKey}`, { timeout: 0 });
                if (!searchRes.data?.status || !searchRes.data?.data?.length) {
                    await sock.sendMessage(chat, { react: { text: "❌", key: msg.key } });
                    return sock.sendMessage(chat, { text: `✿ No se encontraron resultados para **${query}**.` }, { quoted: msg });
                }
                songInfo = searchRes.data.data[0];
                url = songInfo.url;
            }

            const title = cleanText(songInfo.title || songInfo.name) || 'Sin título';
            const artist = cleanText(songInfo.artist) || "Desconocido";
            const album = cleanText(songInfo.album) || "Desconocido";
            const duration = cleanText(songInfo.duration) || "Desconocida";
            const coverUrl = songInfo.image || songInfo.cover || (config as any).banner;

            const caption = `*${title}*\n\n✿ *Artista* » ${artist}\n✿ *Álbum* » ${album}\n✿ *Duración* » ${duration}\n✿ *Link* » ${url}`;

            await sock.sendMessage(chat, { 
                image: { url: coverUrl }, 
                caption
            }, { quoted: msg });

            emitProgress(msgId, 'fetching_audio_stream');
            await sock.sendMessage(chat, { react: { text: "⬇️", key: msg.key } });

            const resAudio = await axios.get(`${apiUrl}/dl/spotify?url=${encodeURIComponent(url)}&key=${apiKey}`, { timeout: 0 });
            if (!resAudio.data?.status || !resAudio.data?.data?.dl) throw new Error('Sin URL de descarga');

            const dlUrl = resAudio.data.data.dl;

            emitProgress(msgId, 'sending_audio_to_whatsapp');

            await sock.sendMessage(chat, { 
                audio: { url: dlUrl }, 
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`,
                ptt: false
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: "✅", key: msg.key } });

        } catch (e: any) {
            console.error(e);
            await sock.sendMessage(chat, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(chat, { text: `❌ Error: ${e.message}` }, { quoted: msg });
        }
    }
};
