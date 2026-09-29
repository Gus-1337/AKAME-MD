export default {
    command: ['chiste', 'chistes'],
    description: 'Chistes buenos',
    category: 'tools',
    run: async ({ chat, m, sock, args }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'chiste' });

            const chistes = [
                "Pepito le dice a su mamá: Mamá, mamá, en la escuela me dicen que soy mentiroso. Y ella: Pepito, tú ni siquiera vas a la escuela.",
                "Jaimito: Profe, ¿me castigaría por algo que no hice? Profe: No. Jaimito: Qué bueno, porque no hice la tarea.",
                "Mamá, mamá, en el cole me llaman despistado. Niño, que esta no es tu casa.",
                "Doctor, doctor, ¿qué me recomienda para la memoria? Que me pague por adelantado.",
                "Cariño, ¿dónde están los niños? En el inglés. ¿What?",
                "¿Qué hace un mudo bailando? Una mudanza.",
                "¿En qué se parece una suegra a un mosquito? En que te chupa la sangre y te arruina el verano.",
                "Papá, ¿qué es el amor? Hijo, el amor es la luz que ilumina la vida. ¿Y qué es la luz? La factura que no has pagado.",
                "Va un tipo al doctor: Doctor, creo que soy invisible. El doctor: ¿Quién dijo eso?",
                "¿Por qué los elefantes no usan computadora? Porque le tienen miedo al ratón.",
                "Le dice la esposa al esposo: ¿Por qué no me traes flores? Y él: ¿Para qué? Todavía no te has muerto.",
                "Jaimito, ¿cuál es tu animal favorito? La foca. ¿Y cómo hace? ¡Aplausos!",
                "Un borracho entra a un bar y grita: ¡Todos los tontos de pie! Se para el cantinero y dice: ¿Qué pasa? El borracho: Ah, solo había uno, ya se puede sentar.",
                "Mamá, ¿qué haces en frente del espejo con los ojos cerrados? Viendo cómo duermo.",
                "¿Qué le dice un semáforo a otro? No me mires que me estoy cambiando.",
                "Doctor, tengo un problema, todos me ignoran. Siguiente.",
                "¿Cómo se llama el primo vegano de Bruce Lee? Broco Lee.",
                "Llega un niño y dice: Mamá, mamá, me caí de la bici. Y la mamá: ¿Y te hiciste daño? Sí, me caí de la bici no me dio tiempo.",
                "Profe: Jaimito, dime dos pronombres. ¿Quién, yo? ¡Muy bien!",
                "¿Qué hace una vaca en un terremoto? Leche merengada.",
                "Mi amor, ¿me amas? Sí, mi vida. ¿Me amarás cuando sea fea y vieja? Claro, ya me adelanté.",
                "Entra un esqueleto al bar y dice: Dame una cerveza y una fregona.",
                "¿Por qué el libro de matemáticas lloraba? Porque tenía muchos problemas sin resolver.",
                "Hijo, ¿por qué no estudias? Porque me quitaron el celular. ¿Y qué tiene que ver? Todo lo que sé está en Google.",
                "¿Cuál es el colmo de un peluquero? Perder el pelo por una cabeza.",
                "Toc toc. ¿Quién es? Nadie. ¿Nadie quién? Nadie, por eso toqué bajito.",
                "Mamá, mamá, ¿los pedos pesan? No hijo. Entonces me cagué.",
                "¿Cómo se despiden dos marihuanos? Ahí nos quemamos.",
                "Amor, ¿me llevas a cenar? Claro, ¿a dónde te llevo? Al límite.",
                "Le dice un amigo a otro: Mi mujer me dejó por mi mejor amigo. ¿Quién es tu mejor amigo? Todavía no lo sé, pero pronto lo averiguaré.",
                "¿Qué hace Batman en el baño? Bat-ducha.",
                "Jaimito, ¿qué harías si te ganaras la lotería? Mirar si es de verdad y no llorar.",
                "Señor, ¿usted no nada? Es que no traje traje y no traje traje para que nade nada.",
                "¿Qué le dice un 2 a un 0? Veinte conmigo guapa.",
                "Estaban dos locos y uno le dice al otro: ¿Qué haces con esa oreja en la mano? Y el otro: ¿Qué, me estás hablando a mí?",
                "¿Por qué las mujeres no pueden ser electricistas? Porque tardan 9 meses en dar a luz.",
                "Mamá, en el cole me llaman feo. No les hagas caso, tú eres guapo... por dentro. ¿Y eso qué es? Que por fuera das miedo.",
                "¿Qué le dijo una nalga a otra? Hay un soplón entre nosotros.",
                "¿Cómo mantiene Einstein a sus hijos entretenidos? Con juegos de memoria.",
                "Novia: Amor, ¿estoy gorda? Novio: No mi amor, tú estás perfecta para un exorcismo.",
                "¿Qué le dice un pez a otro pez? Nada.",
                "¿Por qué Superman no va a misa? Porque es ateo... digo, a Teo no lo conoce.",
                "Papá, papá, ¿me compras una Play? ¿Y para qué quieres una playa si vivimos en Iquitos?",
                "¿En qué se parece tu mamá a un boomerang? Si la botas, vuelve.",
                "Mujer: Amor, ¿dónde estuviste? Hombre: Jugando billar. Mujer: ¿Y por qué hueles a perfume? Hombre: Es que jugué con la bola rosada.",
                "Jaimito le dice a su papá: Papá, papá, ¿me ayudas con la tarea? Claro, ¿qué necesitas? Que no te la copie igualita.",
                "¿Por qué no se puede discutir con un DJ? Porque siempre te cambia de tema.",
                "¿Qué le dice una iguana a su hermana gemela? Somos iguanitas.",
                "Doctor, vengo a que me mire la vista. ¿Y dónde la dejó?",
                "¿Cuál es el colmo de un sordo? Que al morir le pongan música.",
                "Hijo: Papá, ¿qué es un alcohólico? Papá: ¿Ves esas 4 palmeras? Un alcohólico ve 8. Hijo: Papá, si solo hay una."
            ];

            const random = chistes[Math.floor(Math.random() * chistes.length)];

            let text = `╭─〔 🌸 *CHISTE* 🌸 〕─╮\n`;
            text += `│ ${random}\n`;
            text += `╰──────────────╯\n`;
            text += `> AKAME BOT`;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });
            const result = await sock.sendMessage(chat, { text }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ✿ Error en chiste.' }, { quoted: m });
        }
    }
}