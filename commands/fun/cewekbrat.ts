import { delineBytes } from '../../lib/deline.ts';

export default {
    command: ['cewekbrat', 'bratchica'],
    description: 'Crea una imagen estilo brat de chica',
    category: 'fun',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const texto = (args || []).join(' ').trim();
        if (!texto) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}cewekbrat <texto>*\n✦ Ejemplo: *${p}cewekbrat hola*` }, { quoted: msg });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🎀', key: msg.key } }).catch(() => null);
            const img = await delineBytes('/maker/cewekbrat', { text: texto.slice(0, 200) });
            await sock.sendMessage(chat, { image: img, caption: '⋆ AKAME-MD ⋆' }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude crear la imagen, intenta de nuevo.' }, { quoted: msg });
        }
    }
};
