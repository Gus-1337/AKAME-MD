import axios from 'axios';

export default {
    command: ['play4', 'ytmp3v2'],
    category: 'download',
    description: 'YTMP3 API Faa',
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        if (!args.length) {
            return sock.sendMessage(chat, { text: `❌ Uso:.play4 https://youtu.be/MrvRLtuLHdo` }, { quoted: msg });
        }

        const url = args[0];
        if (!url.includes('youtu')) {
            return sock.sendMessage(chat, { text: `❌ Link no válido bro` }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, { text: `⏳ Descargando...` }, { quoted: msg });

            const { data } = await axios.get(`https://api-faa.my.id/faa/ytmp3?url=${encodeURIComponent(url)}`, { timeout: 30000 });

            if (!data.status ||!data.result?.mp3) {
                return sock.sendMessage(chat, { text: `❌ No se pudo descargar` }, { quoted: msg });
            }

            const { title, thumbnail, duration, mp3 } = data.result;

            await sock.sendMessage(chat, {
                image: { url: thumbnail },
                caption: `*${title}*\n⏱️ ${duration}\n\n✅ Listo bro`
            }, { quoted: msg });

            await sock.sendMessage(chat, {
                audio: { url: mp3 },
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`
            }, { quoted: msg });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(chat, { text: `❌ Error en la descarga bro` }, { quoted: msg });
        }
    }
};
