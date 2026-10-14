import { preguntarIA, promptCompleto, enviarRespuesta, deliriusGemini, siputzx, deliriusChatgpt } from '#ia';

export default {
    command: ['gemini'],
    description: 'Pregunta a Gemini',
    category: 'ia',
    run: async ({ chat, m, sock, args }: any) => {
        const pregunta = args.join(' ').trim();
        if (!pregunta) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.gemini <pregunta>*\nEjemplo: *.gemini ¿cuál es la capital de Perú?*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '✨', key: m.key } });
            const { texto } = await preguntarIA([deliriusGemini, siputzx('glm47flash'), deliriusChatgpt], promptCompleto(pregunta));
            await enviarRespuesta(sock, chat, m, '✨ *Gemini*', texto);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
