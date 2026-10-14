import { preguntarIA, promptCompleto, enviarRespuesta, siputzx, yosoyyoDeepseek } from '#ia';

export default {
    command: ['deepseekr1', 'r1'],
    description: 'Pregunta a DeepSeek R1 (razonamiento)',
    category: 'ia',
    run: async ({ chat, m, sock, args }: any) => {
        const pregunta = args.join(' ').trim();
        if (!pregunta) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.deepseekr1 <pregunta>*\nEjemplo: *.deepseekr1 si tengo 3 manzanas y como 1, ¿cuántas quedan?*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🧠', key: m.key } });
            const { texto } = await preguntarIA([siputzx('deepseekr1'), yosoyyoDeepseek, siputzx('gptoss120b')], promptCompleto(pregunta));
            await enviarRespuesta(sock, chat, m, '🧠 *DeepSeek R1*', texto);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
