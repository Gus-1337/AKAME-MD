export default {
    command: ['suerte', 'fortuna'],
    description: 'Tu suerte de hoy',
    category: 'fun',
    run: async ({ chat, m, sock }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'suerte' });

            const niveles = [
                { nivel: 'Muy mala', emoji: '💀', frases: [
                    "Hoy el universo te debe una, pero no es hoy que la cobra.",
                    "Cuidado con las tostadas, caen por el lado de la mantequilla."
                ]},
                { nivel: 'Regular', emoji: '😐', frases: [
                    "Ni fu ni fa. Un día normal, con sus cosas buenas y malas.",
                    "Hoy no es para apostar fuerte, pero tampoco para rendirse."
                ]},
                { nivel: 'Buena', emoji: '🍀', frases: [
                    "Alguien te va a dar una buena noticia antes de la cena.",
                    "Tu intuición está afinada, confía en ella."
                ]},
                { nivel: 'Excelente', emoji: '🌟', frases: [
                    "Hoy todo te sale a la primera. Aprovéchalo.",
                    "La suerte está de tu lado, pide algo con fe."
                ]}
            ];

            const colores = ['rojo', 'azul', 'verde', 'negro', 'dorado', 'morado', 'blanco'];
            const numeroSuerte = Math.floor(Math.random() * 99) + 1;
            const color = colores[Math.floor(Math.random() * colores.length)];
            const pesos = [1, 3, 4, 2];
            let r = Math.random() * pesos.reduce((a, b) => a + b, 0);
            let idx = 0;
            for (let i = 0; i < pesos.length; i++) {
                if (r < pesos[i]) { idx = i; break; }
                r -= pesos[i];
            }
            const { nivel, emoji, frases } = niveles[idx];
            const frase = frases[Math.floor(Math.random() * frases.length)];

            let text = `🔮 *TU SUERTE DE HOY*\n\n`;
            text += `*Nivel:* ${nivel} ${emoji}\n`;
            text += `*Número de la suerte:* ${numeroSuerte}\n`;
            text += `*Color de la suerte:* ${color}\n\n`;
            text += `_${frase}_`;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });
            const result = await sock.sendMessage(chat, { text }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ✿ Error en suerte.' }, { quoted: m });
        }
    }
}
