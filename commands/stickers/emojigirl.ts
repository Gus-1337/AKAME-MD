import axios from 'axios';

export default {
    command: ['emojigirl', 'emojibaila'],
    category: 'stickers',
    description: 'Crea un sticker bailando del emoji que pongas',
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const emoji = args[0];

        if (!emoji) {
            return sock.sendMessage(chat, {
                text: `✿ Usa así:.emojigirl 😁\n✿ Ejemplo:.emojigirl 😭`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, { react: { text: "💃", key: msg.key } });

            const api = `https://api-faa.my.id/faa/emojigerak?emoji=${encodeURIComponent(emoji)}`;

            // Esta API devuelve el mp4 directo, no json
            const res = await axios.get(api, {
                responseType: 'arraybuffer',
                timeout: 20000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            // Si devuelve json por error, lo detectamos
            const contentType = res.headers['content-type'] || "";
            if (contentType.includes('application/json')) {
                const json = JSON.parse(Buffer.from(res.data).toString());
                const videoUrl = json.result || json.url || json.data;
                const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer' });
                await sock.sendMessage(chat, {
                    sticker: Buffer.from(videoRes.data)
                }, { quoted: msg });
            } else {
                // Viene el video directo
                await sock.sendMessage(chat, {
                    sticker: Buffer.from(res.data)
                }, { quoted: msg });
            }

            await sock.sendMessage(chat, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.log('[EMOJIGIRL ERROR]', e.message);
            await sock.sendMessage(chat, {
                text: `❌ Error con ${emoji}, la API no respondió`
            }, { quoted: msg });
        }
    }
};
