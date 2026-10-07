import axios from 'axios';

export default {
    command: ['facebook', 'fb', 'fbdl'],
    category: 'download',
    description: 'Descarga videos de Facebook',
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const url = args[0];
        if (!url) return sock.sendMessage(chat, { text: `✿ Usa:.fb https://fb.watch/xxx` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } });

            const api = `https://api.delirius.online/download/facebook?url=${encodeURIComponent(url)}`;
            const { data } = await axios.get(api);

            if (!data.status ||!data.list ||!data.list[0]?.url) {
                return sock.sendMessage(chat, { text: `✿ No pude sacar el video bro` }, { quoted: msg });
            }

            const videoUrl = data.list[0].url;
            const quality = data.list[0].quality;

            await sock.sendMessage(chat, { react: { text: '📤', key: msg.key } });

            await sock.sendMessage(chat, {
                video: { url: videoUrl },
                caption: `✅ *FB Download*\n🎥 Calidad: ${quality}`,
                mimetype: 'video/mp4',
                jpegThumbnail: null
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.log('[FB ERROR]', e.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: `✿ Error: ${e.message}` }, { quoted: msg });
        }
    }
};
