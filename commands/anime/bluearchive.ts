import { delineBytes } from '../../lib/deline.ts';

export default {
    command: ['bluearchive', 'ba'],
    description: 'Imagen aleatoria de Blue Archive',
    category: 'anime',
    run: async (ctx: any) => {
        const { sock, msg, chat } = ctx;
        try {
            await sock.sendMessage(chat, { react: { text: '🩵', key: msg.key } }).catch(() => null);
            const img = await delineBytes('/random/ba');
            await sock.sendMessage(chat, {
                image: img,
                caption: '╭─────────────────╮\n   🩵 *BLUE ARCHIVE* 🩵\n╰─────────────────╯\n\n⋆ AKAME-MD ⋆'
            }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude traer la imagen, intenta de nuevo.' }, { quoted: msg });
        }
    }
};
