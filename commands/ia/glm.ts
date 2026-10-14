import axios from 'axios';

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
            const { data } = await axios.get('https://api.siputzx.my.id/api/ai/glm47flash', {
                params: { prompt: `Responde en español, de forma clara y breve: ${pregunta}` },
                timeout: 90000
            });
            const respuesta = data?.data?.response;
            if (!data?.status || !respuesta) throw new Error('sin respuesta');
            await sock.sendMessage(chat, { text: `⚡ *GLM 4.7 Flash*\n\n${String(respuesta).trim().slice(0, 3500)}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
