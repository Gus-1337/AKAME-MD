import axios from 'axios';

const primerEmoji = (texto: string): string | null => {
    const seg = new Intl.Segmenter('es', { granularity: 'grapheme' });
    for (const s of seg.segment(texto)) {
        if (/\p{Extended_Pictographic}/u.test(s.segment)) return s.segment;
    }
    return null;
};

export default {
    command: ['emojibaila'],
    category: 'stickers',
    description: 'Crea un sticker bailando del emoji que pongas',
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const emoji = primerEmoji((args || []).join(' '));

        if (!emoji) {
            return sock.sendMessage(chat, {
                text: `✿ Este comando solo funciona con emojis.\n✿ Ejemplo: *.emojibaila 😭*`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '💃', key: msg.key } });

            const api = `https://api-faa.my.id/faa/emojigerak?emoji=${encodeURIComponent(emoji)}`;
            const res = await axios.get(api, {
                responseType: 'arraybuffer',
                timeout: 20000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const contentType = res.headers['content-type'] || '';
            if (contentType.includes('application/json')) {
                const json = JSON.parse(Buffer.from(res.data).toString());
                const videoUrl = json.result || json.url || json.data;
                const videoRes = await axios.get(videoUrl, { responseType: 'arraybuffer' });
                await sock.sendMessage(chat, { sticker: Buffer.from(videoRes.data) }, { quoted: msg });
            } else {
                await sock.sendMessage(chat, { sticker: Buffer.from(res.data) }, { quoted: msg });
            }

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });
        } catch (e) {
            console.log('[EMOJIBAILA ERROR]', e.message);
            await sock.sendMessage(chat, {
                text: `✿ No pude crear el sticker con ${emoji}. Prueba con otro emoji.`
            }, { quoted: msg });
        }
    }
};
