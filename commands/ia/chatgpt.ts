import { preguntarIA, promptCompleto, enviarRespuesta, deliriusChatgpt, stellarChatgpt, siputzx, yosoyyoDeepseek } from '#ia';

export default {
    command: ['chatgpt'],
    description: 'Pregunta a ChatGPT',
    category: 'ia',
    run: async ({ chat, m, sock, args }: any) => {
        const pregunta = args.join(' ').trim();
        if (!pregunta) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.chatgpt <pregunta>*\nEjemplo: *.chatgpt ¿qué es la fotosíntesis?*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🤖', key: m.key } });
            const { texto } = await preguntarIA([deliriusChatgpt, siputzx('gptoss120b'), yosoyyoDeepseek, stellarChatgpt], promptCompleto(pregunta));
            await enviarRespuesta(sock, chat, m, '🤖 *ChatGPT*', texto);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
