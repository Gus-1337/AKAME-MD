export default {
    command: ['reto', 'retos'],
    description: 'Un reto aleatorio para el grupo',
    category: 'fun',
    run: async ({ chat, m, sock }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'reto' });

            const retos = [
                "Manda una nota de voz cantando el coro de tu canción favorita.",
                "Escribe tu mejor poema de 4 versos sobre el primer objeto que veas.",
                "Cambia tu foto de perfil por una selfie con cara de sorpresa durante 1 hora.",
                "Envía un audio imitando a un animal a elección del grupo.",
                "Escribe un mensaje a tu yo del pasado en menos de 20 palabras.",
                "Di un trabalenguas tres veces seguidas sin equivocarte (en audio).",
                "Manda el último emoji que usaste y explica por qué.",
                "Háblale al grupo en acento de locutor de radio durante tres mensajes.",
                "Escribe la historia de tu día en tres palabras.",
                "Recomienda una canción al grupo y justifica tu elección en un solo mensaje.",
                "Haz 10 sentadillas y manda un audio contando cuántas te costaron más.",
                "Manda una foto de lo que tienes más cerca de ti ahora mismo.",
                "Describe tu estado de ánimo usando solo un refrán.",
                "Escribe el nombre de cinco frutas amazónicas en menos de 30 segundos."
            ];

            const reto = retos[Math.floor(Math.random() * retos.length)];

            let text = `🎯 *RETO ALEATORIO*\n\n`;
            text += `> ${reto}\n\n`;
            text += `_Quien no lo cumpla, paga la siguiente ronda 😈_`;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });
            const result = await sock.sendMessage(chat, { text }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ✿ Error en reto.' }, { quoted: m });
        }
    }
}
