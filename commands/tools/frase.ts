export default {
    command: ['frase', 'frases'],
    description: 'Frases que enamoran',
    category: 'tools',
    run: async ({ chat, m, sock, args }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'frase' });

            const romanticas = [
                "Si tuviera que elegir entre respirar y amarte, usaría mi último aliento para decirte que te amo.",
                "No eres mi primera historia, pero quiero que seas la última.",
                "Eres la casualidad más bonita que llegó sin avisar.",
                "Me gustas más que el café en las mañanas.",
                "Tu sonrisa es mi lugar favorito en el mundo.",
                "No necesito mil vidas, me basta una contigo.",
                "Eres mi hoy y todos mis mañana.",
                "Si el amor tuviera nombre, llevaría el tuyo.",
                "Eres poesía sin tener que escribirte.",
                "Contigo todo es más bonito.",
                "Eres mi paz en medio del caos.",
                "Quiero estar contigo hasta que se nos olvide contar los años.",
                "Eres el sueño que no quiero despertar.",
                "Tu nombre es mi palabra favorita.",
                "Cada latido mío lleva tu nombre.",
                "Si el amor fuera un lugar, estaría a tu lado.",
                "Eres mi presente perfecto.",
                "No sabía lo que era extrañar hasta que te alejaste un segundo.",
                "Tus ojos son el universo donde quiero perderme.",
                "Amarte es lo más fácil que he hecho.",
                "Eres mi pensamiento favorito.",
                "No hay nada más bonito que saber que existes.",
                "Eres mi destino favorito.",
                "Quiero ser tu casualidad favorita.",
                "Me enamoré de tu alma antes de tocar tu piel."
            ];

            const hot = [
                "Quiero ser la razón por la que te muerdes los labios.",
                "Tienes algo que me provoca y no es solo tu mirada.",
                "Ven, que te quiero enseñar lo que no digo en mensajes.",
                "Me encantas cuando te pones nerviosa por mi culpa.",
                "Tengo ganas de ti, de esas que no se quitan con nada.",
                "Si me dejas acercarme, no respondo por lo que te haga sentir.",
                "Eres mi tentación favorita.",
                "Quiero perderme en ti y que no me encuentren.",
                "Tu boca me llama y yo no sé decirle que no.",
                "Tienes ese algo que me prende sin tocarme.",
                "Quiero ser tu desvelo de esta noche.",
                "Si me miras así, voy a tener que besarte.",
                "Me gustas, pero me gustas más cuando te pones atrevida.",
                "Tengo planes contigo que no se pueden contar.",
                "Eres el tipo de peligro que sí quiero correr.",
                "Quiero estar tan cerca que respiremos lo mismo.",
                "Me provocas sin siquiera intentarlo.",
                "Ven a robarme un beso, que te dejo robarte todo.",
                "Tu piel debería ser ilegal de lo que me hace sentir.",
                "Quiero hacerte sonreír de esa forma que solo yo conozco.",
                "Eres mi debilidad más rica.",
                "Si supieras lo que pienso cuando te veo sonreír así...",
                "Tienes permiso para desordenarme la mente.",
                "Quiero que seas mi mala idea favorita.",
                "Con esa mirada me tienes haciendo cosas en mi mente."
            ];

            const esHot = args[0]?.toLowerCase() === 'hot';
            const lista = esHot? hot : romanticas;
            const random = lista[Math.floor(Math.random() * lista.length)];

            const titulo = esHot? '🔥 *FRASE HOT* 🔥' : '💌 *FRASE* 💌';

            let text = `╭─〔 ${titulo} 〕─╮\n`;
            text += `│ ${random}\n`;
            text += `╰──────────────╯\n`;
            text += `> AKAME BOT`;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });
            const result = await sock.sendMessage(chat, { text }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ✿ Error en frase.' }, { quoted: m });
        }
    }
}