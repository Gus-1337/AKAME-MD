import axios from 'axios';

const AXIOS_CFG = { timeout: 12000 };

export default {
    command: ['facebook', 'fb', 'fbdl'],
    category: 'download',
    description: 'Descarga videos de Facebook',
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const url = args[0];
        if (!url) return sock.sendMessage(chat, { text: `🌸 Usa:.fb https://fb.watch/xxx` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } });

            let videoUrl, quality, apiUsada = '';

            // PRINCIPAL FAA
            try {
                const { data } = await axios.get(`https://api-faa.my.id/faa/fbdownload?url=${encodeURIComponent(url)}`, AXIOS_CFG);
                if (data?.result?.media) {
                    videoUrl = data.result.media;
                    quality = 'HD';
                    apiUsada = 'FAA';
                } else throw new Error();
            } catch {
                // RESPALDO DELIRIUS
                const { data } = await axios.get(`https://api.delirius.online/download/facebook?url=${encodeURIComponent(url)}`, AXIOS_CFG);
                if (!data?.list?.[0]?.url) throw new Error('Sin video');
                videoUrl = data.list[0].url;
                quality = data.list[0].quality || '720p (HD)';
                apiUsada = 'DELIRIUS';
            }

            await sock.sendMessage(chat, { react: { text: '📤', key: msg.key } });

            const caption = `
.🌸 ○--- *FACEBOOK DESCARGA* ---○ 🌸.
.·:*¨*·.·:*¨*·. 🌸.·:*¨*·.·:*¨*·.
─────────────────
│ ──☆ *Calidad:* ${quality}
│ ──☆ *API:* ${apiUsada}
│ ──☆ *Tamaño:* 5.7 MB aprox
─────────────────
*AKAME-MD* 🌸
`.trim();

            await sock.sendMessage(chat, {
                video: { url: videoUrl },
                caption,
                mimetype: 'video/mp4'
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.log('[FB ERROR]', e.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: `🌸 Error al descargar` }, { quoted: msg });
        }
    }
};
