export default {
    command: ['piropo', 'piropos'],
    description: 'Piropos para tirarle a alguien',
    category: 'fun',
    run: async ({ chat, m, sock }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'piropo' });

            const piropos = [
                "Si fueras un día de la semana, serías el viernes: todos te esperan con ganas.",
                "¿Tienes mapa? Porque acabo de perderme en tu sonrisa.",
                "Si la belleza fuera tiempo, tú serías la eternidad.",
                "Eres como el wifi: se siente cuando te tengo cerca.",
                "Si fueras una estrella, serías la más brillante del cielo.",
                "No sé si eres ángel o demonio, pero me tienes totalmente perdido.",
                "Tus ojos tienen más brillo que cualquier pantalla de noche.",
                "Si la perfección tuviera nombre, sería el tuyo.",
                "Contigo hasta el lunes se siente como sábado.",
                "¿Eres de Google? Porque tienes todo lo que busco.",
                "Si cada beso fuera una palabra, tendríamos una novela entera.",
                "Me gustas más que el café de las mañanas, y eso ya es decir mucho.",
                "Tu sonrisa es el mejor filtro que existe.",
                "Si fueras una canción, serías la que siempre quiero repetir.",
                "Si te portas mal, no te preocupes, a mí también me gusta lo prohibido.",
                "Dicen que la belleza está en los ojos de quien mira, y los míos no paran de mirarte."
            ];

            const remates = [
                "Úsalo bajo tu propio riesgo 😏",
                "Garantía de sonrojo o te devolvemos el piropo 🥰",
                "Sin efectos secundarios conocidos 💘",
                "Nivel de cursilería: alto 🌹"
            ];

            const piropo = piropos[Math.floor(Math.random() * piropos.length)];
            const remate = remates[Math.floor(Math.random() * remates.length)];

            let text = `「✦」 *PIROPO*\n\n`;
            text += `> ${piropo}\n\n`;
            text += `_${remate}_`;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });
            const result = await sock.sendMessage(chat, { text }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ✿ Error en piropo.' }, { quoted: m });
        }
    }
}
