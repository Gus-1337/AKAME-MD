let games = global.adivinanzaGames || {}
global.adivinanzaGames = games

const adivinanzas = [
    { p: "Tengo ciudades pero no casas, montañas pero no árboles, y ríos pero no agua. ¿Qué soy?", r: "mapa" },
    { p: "Oro no es, plata no es, abre la cortina y verás lo que es.", r: "platano" },
    { p: "Va y viene, sube y baja, pero siempre se queda en el mismo sitio.", r: "escalera" },
    { p: "Cuanto más me quitas, más grande soy.", r: "hoyo" },
    { p: "Qué tiene llaves y no abre puertas?", r: "piano" },
    { p: "Qué sube pero nunca baja?", r: "edad" },
    { p: "Si me tienes quieres compartir, si me compartes ya no me tienes.", r: "secreto" },
    { p: "Qué tiene manos y no puede aplaudir?", r: "reloj" },
    { p: "Cuanto más hay menos ves.", r: "oscuridad" },
    { p: "Tiene dientes y no muerde.", r: "peine" },
    { p: "Qué es lo que tiene cuello pero no cabeza?", r: "botella" },
    { p: "Cuanto más seco, más moja.", r: "toalla" },
    { p: "Qué pasa por el agua y no se moja?", r: "luz" },
    { p: "Qué tiene un ojo pero no puede ver?", r: "aguja" },
    { p: "Qué se rompe sin tocarlo?", r: "corazon" },
    { p: "Qué tiene 4 patas y no puede caminar?", r: "mesa" },
    { p: "Voy sin ser llamado y me pierdo sin ser buscado.", r: "silencio" },
    { p: "Si lo nombras desaparece.", r: "silencio" },
    { p: "Nace grande y muere pequeño.", r: "lapiz" },
    { p: "Canto sin voz, vuelo sin alas, silbo sin boca y lloro sin ojos.", r: "viento" },
    { p: "Qué vuela sin alas y llora sin ojos?", r: "nube" },
    { p: "De noche vienen sin ser llamadas, de día se van sin ser robadas.", r: "estrellas" },
    { p: "Blanca por dentro, verde por fuera.", r: "platano" },
    { p: "Qué pesa más, un kilo de algodón o un kilo de hierro?", r: "igual" },
    { p: "Cuantos meses tienen 28 días?", r: "todos" },
    { p: "Qué es lo que entre más se lava más sucio está?", r: "agua" },
    { p: "Tengo llaves pero no cerradura, espacio pero no cuarto.", r: "teclado" },
    { p: "Me compras para comer pero nunca me comes.", r: "plato" },
    { p: "Chiquito como un ratón y cuida la casa como un león.", r: "candado" },
    { p: "Qué es negro cuando está limpio y blanco cuando está sucio?", r: "pizarra" },
    { p: "Tiene cabeza y no tiene cerebro.", r: "ajo" },
    { p: "Qué es aquello que se mira pero no se toca?", r: "horizonte" },
    { p: "Va al agua y no se moja, va al fuego y no se quema.", r: "sombra" },
    { p: "Qué es lo que tiene manos y no puede aplaudir?", r: "reloj" },
    { p: "Estoy en la noche y en el día no, estoy en la luna y en el sol no.", r: "n" },
    { p: "En el mar no me mojo, en las brasas no me quemo, en el aire no me caigo y me tienes en los labios.", r: "a" },
    { p: "Qué sube y baja y se queda en el mismo lugar?", r: "columpio" },
    { p: "Blanco como la leche, negro como el carbón, habla y no tiene boca.", r: "periodico" },
    { p: "Qué se puede cortar sin tijeras?", r: "agua" },
    { p: "Tengo patas pero no camino, tengo cabeza y no pienso.", r: "cama" },
    { p: "Qué pasa por delante del sol y no hace sombra?", r: "viento" },
    { p: "Qué es lo que tiene ojos y no ve?", r: "aguja" },
    { p: "Qué se hace de noche y de día no se hace?", r: "anochece" },
    { p: "Si me mojas te seco, que soy?", r: "toalla" },
    { p: "Tengo agua y no bebo, tengo ojos y no veo.", r: "coco" },
    { p: "Qué es verde y te pega en la cara?", r: "pasto" },
    { p: "Va al río y no bebe, es un burro y no lo parece.", r: "cangrejo" },
    { p: "Estoy en todo y nada está en mi.", r: "agujero" },
    { p: "Qué es lo que tiene ciudades sin casas?", r: "mapa" },
    { p: "Cuanto más me usas menos me ves.", r: "oscuridad" },
]

export default {
    command: ['adivinanza', 'adivina'],

    before: async (ctx) => {
        const { m, sock, chat } = ctx
        let text = (ctx.text || ctx.body || "").toLowerCase().trim()
        if (!text ||!games[chat]) return false
        if (text.startsWith('.')) return false
        if (!m?.quoted &&!(m as any)?.isQuoted) return false

        const game = games[chat]
        const correcta = game.r.toLowerCase()
        const respuesta = text

        if (respuesta.includes(correcta) || correcta.includes(respuesta)) {
            delete games[chat]
            await sock.sendMessage(chat, {
                text: `*» ADIVINANZAS «*\n\n✅ ¡Correcto! Era *${game.r}* 🎉\n\n👤 Ganador: @${m.sender.split('@')[0]}`,
                mentions: [m.sender]
            }, { quoted: m })
            return true
        } else {
            game.intentos = (game.intentos || 3) - 1

            if (game.intentos <= 0) {
                delete games[chat]
                await sock.sendMessage(chat, {
                    text: `*» ADIVINANZAS «*\n\n❌ Se acabaron los intentos bro!\n\n*Respuesta:* ${game.r}`
                }, { quoted: m })
            } else {
                await sock.sendMessage(chat, {
                    text: `*» ADIVINANZAS «*\n\n❌ Incorrecto bro, te quedan *${game.intentos} intentos*\n\nSigue intentando!`
                }, { quoted: m })
            }
            return true
        }
    },

    run: async ({ m, sock, chat }) => {
        if (games[chat]) return sock.sendMessage(chat, { text: `*» ADIVINANZAS «*\n\n⚠️ Ya hay una activa bro, responde esa primero` }, { quoted: m })

        const random = adivinanzas[Math.floor(Math.random() * adivinanzas.length)]
        games[chat] = {...random, intentos: 3 }

        await sock.sendMessage(chat, {
            text: `*» ADIVINANZAS «*\n\n*» Pregunta* : ${random.p}\n\n• Responde directamente a este mensaje con tu respuesta.\n• Tienes *3 intentos*.`
        }, { quoted: m })

        setTimeout(async () => {
            if (games[chat] && games[chat].p === random.p) {
                delete games[chat]
                await sock.sendMessage(chat, { text: `*» ADIVINANZAS «*\n\n⏰ Tiempo agotado!\n\n*Respuesta:* ${random.r}` })
            }
        }, 60000)
    }
}