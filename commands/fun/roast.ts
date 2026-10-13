export default {
    command: ['roast', 'tostar'],
    description: 'Tuesta de broma a alguien (sin groserías, todo en plan cariñoso)',
    category: 'fun',
    run: async ({ chat, m, sock }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'roast' });

            // Objetivo: la persona mencionada, la citada o quien envía el comando
            const who = m.mentionedJid?.[0] || (m as any).quoted?.sender || m.sender;

            const roasts = [
                "Tiene tanta paciencia que hasta el wifi se rinde antes que él.",
                "Llega tarde hasta a sus propios planes, pero siempre con excusas de película.",
                "Su nivel de organización es el de un cajón de cables.",
                "Dice que va a estudiar y lo que estudia es el catálogo de Netflix.",
                "Cuando dice 'ya voy', todavía está pensando en ponerse los zapatos.",
                "Es tan puntual como el tráfico de Iquitos a las 6 de la tarde.",
                "Su sentido de la orientación es un GPS que siempre dice 'recalculando'.",
                "Tiene la energía de un lunes a las 7 de la mañana, pero con más sueño.",
                "Si la indecisión fuera deporte, ya tendría medalla de oro.",
                "Guarda memes como si fueran a pagarle la renta.",
                "Dice que es 'de buen comer', pero el delivery lo conoce por su nombre.",
                "Su mejor habilidad es aparecer justo cuando ya se terminó la comida.",
                "Lee los mensajes, piensa la respuesta, y al final manda un 'jajaja' 🙂.",
                "Tiene más pestañas abiertas en el navegador que amigos en el grupo, y eso es decir bastante."
            ];

            const remates = [
                "Todo con cariño, no te lo tomes tan en serio 😂",
                "Amor de roast, no de odio 🔥",
                "Hoy te toca a ti, la próxima me toca a mí 🤣",
                "Nadie se salva del roast 💀"
            ];

            const roast = roasts[Math.floor(Math.random() * roasts.length)];
            const remate = remates[Math.floor(Math.random() * remates.length)];

            let text = `🔥 *ROAST*\n\n`;
            text += `@${who.split('@')[0]}, ${roast}\n\n`;
            text += `_${remate}_`;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });
            const result = await sock.sendMessage(chat, { text, mentions: [who] }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ✿ Error en roast.' }, { quoted: m });
        }
    }
}
