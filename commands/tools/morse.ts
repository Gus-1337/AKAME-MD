import { pedirUtil } from '#popcat';

export default {
    command: ['morse'],
    description: 'Convierte texto a código morse',
    category: 'tools',
    run: async ({ chat, m, sock, args, text }: any) => {
        const t = (args?.join(' ') || text || '').trim();
        if (!t) {
            return sock.sendMessage(chat, { text: '   ׄ  ✿  Escribe el texto. Ej: *.morse hola*' }, { quoted: m });
        }
        try {
            const r = await pedirUtil('texttomorse', { text: t });
            return sock.sendMessage(chat, {
                text: `˚₊· ͟͟͞͞➳❥ *MORSE*\n───────────────\n${r.morse}\n───────────────`
            }, { quoted: m });
        } catch (e: any) {
            return sock.sendMessage(chat, { text: `✿ No pude convertir el texto.\n> ${e.message}` }, { quoted: m });
        }
    }
};
