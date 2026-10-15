import { pedirUtil } from '#popcat';

export default {
    command: ['8ball', 'bola8'],
    description: 'Hazle una pregunta a la bola mágica',
    category: 'fun',
    run: async ({ chat, m, sock, args, text }: any) => {
        const pregunta = (args?.join(' ') || text || '').trim();
        if (!pregunta) {
            return sock.sendMessage(chat, {
                text: '   ׄ  ✿  Escribe tu pregunta. Ej: *.8ball ¿Me va a ir bien hoy?*'
            }, { quoted: m });
        }
        try {
            const msg = await pedirUtil('8ball', { text: pregunta });
            return sock.sendMessage(chat, {
                text: [
                    '˚₊· ͟͟͞͞➳❥ *BOLA 8*',
                    '───────────────',
                    `❓ ${pregunta}`,
                    `🎱 *${msg.answer}*`,
                    '───────────────'
                ].join('\n')
            }, { quoted: m });
        } catch (e: any) {
            return sock.sendMessage(chat, { text: `✿ No pude consultar la bola 8.\n> ${e.message}` }, { quoted: m });
        }
    }
};
