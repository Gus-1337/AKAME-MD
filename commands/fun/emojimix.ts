import { emojisDe, mezclarEmojis } from '#emojimix';

export default {
    command: ['emojimix', 'mezclaemoji'],
    description: 'Combina dos emojis. Uso: .emojimix 😂🔥',
    category: 'fun',
    run: async ({ chat, m, sock, args, text }: any) => {
        const entrada = (args?.join(' ') || text || '').trim();
        const emojis = emojisDe(entrada);
        if (emojis.length !== 2) {
            return sock.sendMessage(chat, {
                text: '   ׄ  ✿  Escribe dos emojis.\n> Ej: *.emojimix 😂🔥*'
            }, { quoted: m });
        }
        const [a, b] = emojis;
        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            const png = await mezclarEmojis(a, b);
            if (!png) {
                await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return sock.sendMessage(chat, {
                    text: `✿ No existe una mezcla de ${a} + ${b}. Prueba con otros emojis.`
                }, { quoted: m });
            }
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return sock.sendMessage(chat, {
                image: png,
                caption: `˚₊· ͟͟͞͞➳❥ *EMOJIMIX*\n───────────────\n${a} + ${b}\n───────────────`
            }, { quoted: m });
        } catch (e: any) {
            return sock.sendMessage(chat, { text: `✿ No pude mezclar esos emojis.\n> ${e.message}` }, { quoted: m });
        }
    }
};
