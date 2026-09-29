export default {
    command: ['consejo', 'consejos'],
    description: 'Consejo del día',
    category: 'tools',
    run: async ({ chat, m, sock, args }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'consejo' });

            const consejos = [
                "Cuida tu energía. No todos merecen acceso a ti. Bloquea, silencia, aléjate. La paz se protege.",
                "Deja de rogar atención. El que quiere estar, está. El que no, que se pierda.",
                "No cuentes tus planes. La envidia no hace ruido pero destruye.",
                "Si te fallaron una vez es error de ellos, si te fallan dos es culpa tuya por quedarte.",
                "No te compares. Cada quien tiene su tiempo, su proceso y su brillo.",
                "Aprende a estar solo. Ahí es donde te vuelves peligroso.",
                "No persigas, atrae. Cuando te valoras, todo llega.",
                "Deja de explicar tu vida a gente que solo quiere chisme, no ayudarte.",
                "Si no te suma, que no te reste. Si no te resta, que no estorbe.",
                "La lealtad no se pide, se demuestra. Mira acciones, no palabras.",
                "No vuelvas donde ya te sentiste pequeño. Tú no estás para rogar amor.",
                "El dinero va y viene, pero la dignidad no se negocia.",
                "Rodéate de gente que hable de proyectos, no de personas.",
                "A veces perder es ganar. Perder gente falsa es paz.",
                "No seas opción de nadie. O eres prioridad o eres nada.",
                "Trabaja callado. Que tus resultados hagan el ruido.",
                "Si te quieren ver mal, sorpréndelos estando mejor.",
                "No confíes en quien habla mal de todos contigo, mañana hablará mal de ti.",
                "Tu paz vale más que tener la razón en una discusión.",
                "Deja de esperar el momento perfecto, haz que el momento sea perfecto.",
                "Quien te quiere te busca, el resto son excusas.",
                "No mendigues amor, no mendigues amistad, no mendigues nada.",
                "Si algo te incomoda, aléjate. Tu intuición nunca falla.",
                "Sé bueno pero no cojudo. Hay gente que confunde amabilidad con debilidad.",
                "No todo se lo cuentes a todos. El silencio también protege.",
                "Si te fuiste, no mires atrás. Lo que dejaste ya no existe.",
                "Enfócate tanto en tu vida que no tengas tiempo para envidiar la de otros.",
                "El que te envidia no te odia, odia no poder ser tú.",
                "A veces hay que ser frío para no salir herido.",
                "No te rebajes por nadie. El que se va, que le vaya bonito pero lejos.",
                "Si duele, no es ahí. Lo que es para ti no te hace sentir miserable.",
                "No intentes encajar donde no te quieren. Brilla en otro lado.",
                "Deja de darle segundas oportunidades a quien no aprovechó la primera.",
                "Tu vida mejora cuando dejas de tomarte personal lo que hace gente rota.",
                "No expliques tu progreso a quien solo quiere verte estancado.",
                "La gente cambia cuando les conviene, no cuando tú lo necesitas.",
                "Si tienes que forzar, no es para ti.",
                "Aléjate de quien te hace dudar de ti mismo.",
                "No te disculpes por tener estándares altos. El que quiere, alcanza.",
                "Aprende a decir no sin sentir culpa. Es poder.",
                "No todos los que te aplauden te quieren ver ganar.",
                "Si alguien se va y vuelve como si nada, es porque nunca te valoró.",
                "Deja de salvar a gente que no quiere ser salvada.",
                "Tu mejor venganza es no ser como los que te hirieron.",
                "No hables de lealtad si no sabes quedarte cuando todo se pone feo.",
                "El respeto se gana, no se exige. Pero la falta de respeto no se perdona.",
                "Si te hace ansiedad, no es amor.",
                "No le des tu corazón a quien solo te pide tu cuerpo o tu tiempo.",
                "A veces el cierre eres tú yéndote sin decir nada.",
                "No busques en otras personas lo que debes darte tú.",
                "Deja de stalkear lo que te hace daño. Borra, bloquea y avanza.",
                "Si te ilusionan y luego te ignoran, no es confusión, es manipulación.",
                "No vuelvas a leer conversaciones viejas. Ya sabes cómo termina.",
                "La disciplina le gana a la motivación todos los días.",
                "No necesitas que todos te entiendan, necesitas estar bien contigo.",
                "Si no te escribe, si no te busca, si no te cuida, ahí tienes tu respuesta.",
                "Deja de ser el plan B de alguien que tú hiciste tu plan A.",
                "Quien te quiere no te hace competir con nadie.",
                "No te aferres a migajas si mereces el banquete completo.",
                "Si te duele ver sus historias, siléncialas. Tu salud mental primero.",
                "No le ruegues a nadie que se quede. La puerta está grande.",
                "A la gente se le conoce en la escasez, no en la abundancia.",
                "No te sientas mal por brillar. El sol no pide permiso.",
                "Si te juzgan por tu pasado, es porque no han superado el suyo.",
                "Aprende a irte de la mesa cuando ya no te sirven respeto.",
                "No todo el que sonríe contigo es tu amigo.",
                "Deja de buscar amor en quien solo busca distracción.",
                "Si hoy no puedes con todo, con un poco basta. Pero no te rindas.",
                "Tu glow up empieza cuando dejas de preocuparte por caerle bien a todos.",
                "No le des explicaciones a quien no te da soluciones."
            ];

            const random = consejos[Math.floor(Math.random() * consejos.length)];

            let text = `「✦」 *CONSEJO DEL DÍA*\n\n`;
            text += `> ${random}\n\n`;
            text += `_Tómalo, aplícalo y sigue pa' delante 👹_`;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });
            const result = await sock.sendMessage(chat, { text }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ✿ Error en consejo.' }, { quoted: m });
        }
    }
}