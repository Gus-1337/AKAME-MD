import axios from 'axios';

/** Quita el bloque de razonamiento <think>...</think> que devuelve DeepSeek R1. */
const limpiar = (t: string) =>
    t.replace(/<think>[\s\S]*?<\/think>/gi, '')
     .replace(/<think>[\s\S]*/gi, '')
     .trim();

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
            const { data } = await axios.get('https://api.siputzx.my.id/api/ai/deepseekr1', {
                params: { prompt: `Responde solo en español, de forma clara y breve, sin mostrar tu razonamiento: ${pregunta}` },
                timeout: 120000
            });
            const respuesta = limpiar(String(data?.data?.response || ''));
            if (!data?.status || !respuesta) throw new Error('sin respuesta');
            await sock.sendMessage(chat, { text: `🧠 *DeepSeek R1*\n\n${respuesta.slice(0, 3500)}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
