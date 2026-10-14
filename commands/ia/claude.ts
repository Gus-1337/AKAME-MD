import { preguntarIA, promptCompleto, enviarRespuesta, faaClaude, deliriusChatgpt, siputzx } from '#ia';

export default {
    command: ['claude'],
    description: 'Pregunta a Claude',
    category: 'ia',
    run: async ({ chat, m, sock, args }: any) => {
        const pregunta = args.join(' ').trim();
        if (!pregunta) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.claude <pregunta>*\nEjemplo: *.claude explícame la fotosíntesis en pocas palabras*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🧡', key: m.key } });
            const { texto } = await preguntarIA([faaClaude, deliriusChatgpt, siputzx('gptoss120b')], promptCompleto(pregunta));
            await enviarRespuesta(sock, chat, m, '🧡 *Claude*', texto);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
