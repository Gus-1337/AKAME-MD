import axios from 'axios';

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
            const { data } = await axios.get('https://api.delirius.online/ia/gemini', {
                params: { query: `Responde en español, de forma clara y breve: ${pregunta}` },
                timeout: 60000
            });
            const respuesta = typeof data?.data === 'string' ? data.data : data?.data?.result;
            if (!data?.status || !respuesta) throw new Error('sin respuesta');
            await sock.sendMessage(chat, { text: `✨ *Gemini*\n\n${respuesta.trim().slice(0, 3500)}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
