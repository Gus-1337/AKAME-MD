import { preguntarIA, promptCompleto, enviarRespuesta, siputzx, yosoyyoDeepseek } from '#ia';

export default {
    command: ['phi', 'phi2'],
    description: 'Pregunta a Phi-2',
    category: 'ia',
    run: async ({ chat, m, sock, args }: any) => {
        const pregunta = args.join(' ').trim();
        if (!pregunta) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.phi <pregunta>*\nEjemplo: *.phi ¿qué es la luna?*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '💡', key: m.key } });
            const { texto } = await preguntarIA([siputzx('phi2'), siputzx('glm47flash'), yosoyyoDeepseek], promptCompleto(pregunta));
            await enviarRespuesta(sock, chat, m, '💡 *Phi-2*', texto);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
