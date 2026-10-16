import { delineBytes } from '../../lib/deline.ts';

const horaActual = () => {
    const d = new Date(Date.now() - 5 * 60 * 60 * 1000); // hora de Perú
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

export default {
    command: ['chatfalso'],
    description: 'Crea una captura falsa de un chat de iPhone',
    category: 'fun',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const texto = (args || []).join(' ').trim();
        if (!texto) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}chatfalso <mensaje>*\n✦ Ejemplo: *${p}chatfalso hola, cómo estás*` }, { quoted: msg });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '📱', key: msg.key } }).catch(() => null);
            const hora = horaActual();
            const img = await delineBytes('/maker/iqc', { text: texto.slice(0, 200), chatTime: hora, statusBarTime: hora });
            await sock.sendMessage(chat, { image: img, caption: '⋆ AKAME-MD ⋆' }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude crear la imagen, intenta de nuevo.' }, { quoted: msg });
        }
    }
};
