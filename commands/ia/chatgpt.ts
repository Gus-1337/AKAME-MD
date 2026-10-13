import axios from 'axios';

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
            const { data } = await axios.get('https://api.delirius.online/ia/chatgpt', {
                params: { q: `Responde en español, de forma clara y breve: ${pregunta}` },
                timeout: 60000
            });
            const respuesta = typeof data?.data === 'string' ? data.data : data?.data?.result;
            if (!data?.status || !respuesta) throw new Error('sin respuesta');
            await sock.sendMessage(chat, { text: `🤖 *ChatGPT*\n\n${respuesta.trim().slice(0, 3500)}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
