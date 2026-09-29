export default {
    command: ['facto', 'factos'],
    description: 'Factos que duelen',
    category: 'tools',
    run: async ({ chat, m, sock, args }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'facto' });

            const factos = [
                "Si no te escribe es porque no quiere. Todos tenemos 5 segundos para escribir.",
                "Si le gustas a alguien se nota, y si no le gustas se nota más.",
                "Nadie está demasiado ocupado, solo no eres su prioridad.",
                "El que te quiere te busca, el que no te inventa excusas.",
                "Dejaste de ser importante cuando dejaste de ser útil.",
                "La gente no cambia, solo se les acaba el interés en fingir.",
                "Si te revisa las historias pero no te habla, solo está viendo si sigues ahí.",
                "No te extrañan, extrañan lo que les dabas.",
                "Te dejan en visto porque tu mensaje no les emociona.",
                "El amor no duele, duele aferrarte a alguien que no te quiere.",
                "Si tienes que preguntar si le importas, ya sabes la respuesta.",
                "Te superaron más rápido de lo que tú crees.",
                "Si habla mal de su ex contigo, mañana hablará mal de ti con otra.",
                "No es que seas difícil de amar, es que estás pidiendo amor a la persona equivocada.",
                "Si te fue infiel una vez, no es un error, es su forma de ser.",
                "Si te bloquea y desbloquea, no es amor, es control.",
                "Te responden rápido cuando les interesas, lo demás es cuento.",
                "No te dejó de querer de la noche a la mañana, ya no te quería desde antes.",
                "Si te compara con otros, es porque no te valora a ti.",
                "Si te escribe solo de noche, no te quiere, te quiere usar.",
                "La gente vuelve no porque te extrañe, sino porque no encontró algo mejor.",
                "Si tienes que mendigar amor, ahí no es.",
                "No te hacen ghosting por miedo, te lo hacen porque no les importas lo suficiente.",
                "Si te ama no te va a dejar con la duda de si te ama.",
                "Deja de romantizar migajas, eso no es amor es hambre.",
                "Si te quiso ver mal y te vio bien, le dolió más a él que a ti.",
                "Si te duele, no es ahí. Por más que quieras que sea ahí.",
                "El interés se nota, el desinterés se nota más.",
                "No te ilusionó, tú te ilusionaste solo con poco.",
                "Si te busca solo cuando está aburrido, tú eres su aburrimiento, no su gusto.",
                "Si te cambió por otra, no perdiste, te salvaste.",
                "Si no te presume, te esconde.",
                "Si te deja en delivered por horas y sube historias, ya sabes dónde estás en su lista.",
                "El amor no se ruega, y si se ruega no es amor.",
                "Si vuelve cada que lo dejan, tú no eres su amor, eres su refugio.",
                "No eres su amor, eres su mientras tanto.",
                "Si te quiere, lo sabes. Si no te quiere, lo confundes.",
                "Deja de buscar señales, la falta de interés ya es la señal más clara."
            ];

            const remates = [
                "Si te dolió, es porque te cayó 👹",
                "Tómalo como quieras, pero es la verdad 💀",
                "Facto que no querías leer pero necesitabas 👊",
                "Duele, pero así es la gente hoy 😮‍💨",
                "No es hate, es realidad 🧠",
                "Si te pica, ráscate solo 🫵",
                "Crudo pero cierto, pa' que despiertes 🔥",
                "No lo digo yo, lo hace la gente 🤷‍♂️",
                "Sigue llorando o sigue avanzando, tú eliges 👹",
                "Guárdatelo, te va a servir 💭"
            ];

            const factoRandom = factos[Math.floor(Math.random() * factos.length)];
            const remateRandom = remates[Math.floor(Math.random() * remates.length)];

            let text = `「✦」 *FACTO*\n\n`;
            text += `> ${factoRandom}\n\n`;
            text += `_${remateRandom}_`;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });
            const result = await sock.sendMessage(chat, { text }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ✿ Error en facto.' }, { quoted: m });
        }
    }
}