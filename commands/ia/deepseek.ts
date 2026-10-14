import { preguntarIA, promptCompleto, enviarRespuesta, yosoyyoDeepseek, siputzx } from '#ia';

export default {
    command: ['deepseek'],
    description: 'Pregunta a DeepSeek',
    category: 'ia',
    run: async ({ chat, m, sock, args }: any) => {
        const pregunta = args.join(' ').trim();
        if (!pregunta) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.deepseek <pregunta>*\nEjemplo: *.deepseek explícame qué es un agujero negro*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🧠', key: m.key } });
            const { texto } = await preguntarIA([yosoyyoDeepseek, siputzx('deepseekr1'), siputzx('gptoss120b')], promptCompleto(pregunta));
            await enviarRespuesta(sock, chat, m, '🧠 *DeepSeek*', texto);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
