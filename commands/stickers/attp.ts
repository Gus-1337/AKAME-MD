import { delineBytes } from '../../lib/deline.ts';

export default {
    command: ['attp'],
    description: 'Crea un sticker animado con texto',
    category: 'stickers',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const texto = (args || []).join(' ').trim();
        if (!texto) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}attp <texto>*\n✦ Ejemplo: *${p}attp hola*` }, { quoted: msg });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🎨', key: msg.key } }).catch(() => null);
            const webp = await delineBytes('/maker/attp', { text: texto.slice(0, 120) });
            await sock.sendMessage(chat, { sticker: webp }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude crear el sticker, intenta de nuevo.' }, { quoted: msg });
        }
    }
};
