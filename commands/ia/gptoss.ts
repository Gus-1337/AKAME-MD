import axios from 'axios';

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
            const { data } = await axios.get('https://api.siputzx.my.id/api/ai/gptoss120b', {
                params: { prompt: `Responde en español, de forma clara y breve: ${pregunta}` },
                timeout: 90000
            });
            const respuesta = data?.data?.response;
            if (!data?.status || !respuesta) throw new Error('sin respuesta');
            await sock.sendMessage(chat, { text: `🧠 *GPT OSS 120B*\n\n${String(respuesta).trim().slice(0, 3500)}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
