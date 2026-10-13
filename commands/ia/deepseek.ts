import axios from 'axios';

const YOSOYYO_URL = 'https://api-yosoyyo-api-ofc.onrender.com';
const YOSOYYO_KEY = process.env.YOSOYYO_KEY || 'Akame-proyet';

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
            const { data } = await axios.get(`${YOSOYYO_URL}/api/deepseek`, {
                params: { prompt: `Responde en español, de forma clara y breve: ${pregunta}`, apiKey: YOSOYYO_KEY },
                timeout: 60000
            });
            const respuesta = data?.result?.answer;
            if (!data?.status || !respuesta) throw new Error('sin respuesta');
            await sock.sendMessage(chat, { text: `🧠 *DeepSeek*\n\n${String(respuesta).trim().slice(0, 3500)}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
