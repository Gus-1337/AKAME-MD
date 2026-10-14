import axios from 'axios';

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
            const { data } = await axios.get('https://api-faa.my.id/faa/claude-ai', {
                params: { text: `Responde en español, de forma clara y breve: ${pregunta}` },
                timeout: 60000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const respuesta = data?.result;
            if (!data?.status || typeof respuesta !== 'string' || !respuesta.trim()) throw new Error('sin respuesta');
            await sock.sendMessage(chat, { text: `🧡 *Claude*\n\n${respuesta.trim().slice(0, 3500)}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: '✿ No pude responder ahora, intenta de nuevo' }, { quoted: m });
        }
    }
};
