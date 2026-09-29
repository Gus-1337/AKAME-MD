export default {
    command: ['gay', 'medidor', 'gaymeter'],
    description: 'Medidor invisible gay',
    category: 'tools',
    run: async ({ chat, m, sock, args }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'gay' });

            let who = m.mentionedJid?.[0] || (m as any).quoted?.sender || m.sender

            // AHORA SI RANDOM
            let porcentaje = Math.floor(Math.random() * 101)

            let nivel = ''
            let frase = ''

            const frasesBajo = [
                "Na, es poquito, casi ni se nota. Por ahora estás safe 😅",
                "Tranquilo bro, ese % no es nada, aún eres hetero",
                "Uy con eso no hay nada que aceptar, estás limpio"
            ]
            const frasesMedioBajo = [
                "Algo hay ahí bro, acéptalo poco a poco 😏",
                "Ya se te está notando bro, ve aceptándolo",
                "Ese % ya preocupa, toca aceptarlo"
            ]
            const frasesMedio = [
                "Mitad y mitad bro, ya no puedes negarlo. Acéptalo 👹",
                "Con ese % ya es hora de que lo aceptes, no lo niegues",
                "Bi confirmado, toca aceptar tu destino 🌈"
            ]
            const frasesAlto = [
                "Bro con ese % ya acéptalo, no hay vuelta atrás 💀",
                "Ya no lo escondas bro, el medidor te delató. Acéptalo",
                "Gay de closet detectado, deja de negarlo y acéptalo"
            ]
            const frasesMax = [
                "Bro acéptalo de una vez, eres 100% gay y punto 🌈👠",
                "Ya no hay nada que hacer, acéptalo que te gustan los bros",
                "Con ese % ya pide tu membresía premium, acéptalo bro 👹"
            ]

            if (porcentaje <= 20) {
                nivel = 'Bajo, casi hetero.'
                frase = frasesBajo[Math.floor(Math.random() * frasesBajo.length)]
            } else if (porcentaje <= 40) {
                nivel = 'Altamente detectado.'
                frase = frasesMedioBajo[Math.floor(Math.random() * frasesMedioBajo.length)]
            } else if (porcentaje <= 60) {
                nivel = 'Mitad y mitad, bi sospechoso.'
                frase = frasesMedio[Math.floor(Math.random() * frasesMedio.length)]
            } else if (porcentaje <= 80) {
                nivel = 'Gay de closet detectado.'
                frase = frasesAlto[Math.floor(Math.random() * frasesAlto.length)]
            } else {
                nivel = '100% gay, ya sal del closet.'
                frase = frasesMax[Math.floor(Math.random() * frasesMax.length)]
            }

            let pp: string
            try {
                pp = await sock.profilePictureUrl(who, 'image')
            } catch {
                pp = 'https://telegra.ph/file/24fa902ead26340f3df2c.png'
            }

            let text = `⚖️ *EL MEDIDOR INVISIBLE* ⚖️\n\n`
            text += `Escaneando a: @${who.split('@')[0]}\n\n`
            text += `*RESULTADO:* ${porcentaje}%\n`
            text += `*NIVEL:* ${nivel}\n\n`
            text += `_${frase}_`

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });
            const result = await sock.sendMessage(chat, {
                image: { url: pp },
                caption: text,
                mentions: [who]
            }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ✿ Error en gay.' }, { quoted: m });
        }
    }
}