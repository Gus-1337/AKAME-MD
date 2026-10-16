import { delineBytes } from '../../lib/deline.ts';
import { imageToWebp } from '#sticker';

export default {
    command: ['bratchica'],
    description: 'Crea un sticker estilo brat con texto',
    category: 'stickers',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const texto = (args || []).join(' ').trim();
        if (!texto) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}bratchica <texto>*\n✦ Ejemplo: *${p}bratchica hola*` }, { quoted: msg });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🎀', key: msg.key } }).catch(() => null);
            const img = await delineBytes('/maker/cewekbrat', { text: texto.slice(0, 200) });
            const webp = await imageToWebp(img);
            await sock.sendMessage(chat, { sticker: webp }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude crear el sticker, intenta de nuevo.' }, { quoted: msg });
        }
    }
};
