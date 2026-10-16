import { delineBytes } from '../../lib/deline.ts';

export default {
    command: ['textoimagen'],
    description: 'Crea una imagen de texto estilo sticker',
    category: 'stickers',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const texto = (args || []).join(' ').trim();
        if (!texto) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}textoimagen <texto>*\n✦ Ejemplo: *${p}textoimagen hola amigos*` }, { quoted: msg });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🎨', key: msg.key } }).catch(() => null);
            const img = await delineBytes('/maker/ttp', { text: texto.slice(0, 200), color: 'white' });
            await sock.sendMessage(chat, { image: img }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude crear la imagen, intenta de nuevo.' }, { quoted: msg });
        }
    }
};
