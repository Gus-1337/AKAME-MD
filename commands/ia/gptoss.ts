import { preguntarIA, promptCompleto, enviarRespuesta, siputzx, deliriusChatgpt, yosoyyoDeepseek } from '#ia';

export default {
    command: ['gptoss', 'gptoss120b'],
    description: 'Pregunta a GPT OSS 120B',
    category: 'ia',
    run: async ({ chat, m, sock, args }: any) => {
        const pregunta = args.join(' ').trim();
        if (!pregunta) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.gptoss <pregunta>*\nEjemplo: *.gptoss ¿qué es un agujero negro?*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🧠', key: m.key } });
            const { texto } = await preguntarIA([siputzx('gptoss120b'), deliriusChatgpt, yosoyyoDeepseek], promptCompleto(pregunta));
            await enviarRespuesta(sock, chat, m, '🧠 *GPT OSS 120B*', texto);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
