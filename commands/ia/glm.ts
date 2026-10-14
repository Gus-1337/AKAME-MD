import { preguntarIA, promptCompleto, enviarRespuesta, siputzx, deliriusChatgpt } from '#ia';

export default {
    command: ['glm'],
    description: 'Pregunta a GLM 4.7 Flash',
    category: 'ia',
    run: async ({ chat, m, sock, args }: any) => {
        const pregunta = args.join(' ').trim();
        if (!pregunta) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.glm <pregunta>*\nEjemplo: *.glm dame 3 consejos para estudiar*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '⚡', key: m.key } });
            const { texto } = await preguntarIA([siputzx('glm47flash'), siputzx('gptoss120b'), deliriusChatgpt], promptCompleto(pregunta));
            await enviarRespuesta(sock, chat, m, '⚡ *GLM 4.7 Flash*', texto);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
