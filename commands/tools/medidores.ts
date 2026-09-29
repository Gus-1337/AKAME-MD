export default {
    command: ['lesbiana', 'pansexual', 'hetero', 'trans', 'bi', 'bisexual'],
    description: 'Medidores LGBT',
    category: 'tools',
    run: async ({ chat, m, sock, args }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'medidor' });

            let who = m.mentionedJid?.[0] || (m as any).quoted?.sender || m.sender
            let cmd = (m as any).command || m.text?.split(' ')[0]?.replace(/^\./, '') || 'gay'
            cmd = cmd.toLowerCase()

            let porcentaje = Math.floor(Math.random() * 101)

            let pp: string
            try { pp = await sock.profilePictureUrl(who, 'image') }
            catch { pp = 'https://telegra.ph/file/24fa902ead26340f3df2c.png' }

            let titulo = ''
            let nivel = ''
            let frase = ''

            if (cmd === 'lesbiana') {
                titulo = '🌈 EL MEDIDOR LESBIANA'
                if (porcentaje <= 20) { nivel = 'Baja, hetero curiosa.'; frase = 'Na bro, esa no es tortillera, tranquila.' }
                else if (porcentaje <= 40) { nivel = 'Algo se le nota.'; frase = 'Ya le gustan las amigas un poquito, acéptalo sis.' }
                else if (porcentaje <= 60) { nivel = 'Bi-curious.'; frase = 'Mitad y mitad, le gustan ambos bandos.' }
                else if (porcentaje <= 80) { nivel = 'Tortillera de closet.'; frase = 'Ya no lo niegues mami, acéptalo.' }
                else { nivel = '100% Lesbiana.'; frase = 'Confirmadísima, solo le gustan las bichotas.' }

            } else if (cmd === 'pansexual') {
                titulo = '💖 EL MEDIDOR PANSEXUAL'
                if (porcentaje <= 20) { nivel = 'Bajo, muy selectivo.'; frase = 'Na, tu solo miras uno, estás safe.' }
                else if (porcentaje <= 40) { nivel = 'Curioso.'; frase = 'Algo hay ahí, te gusta lo que sea con que respire.' }
                else if (porcentaje <= 60) { nivel = 'Pan en proceso.'; frase = 'Ya te da igual todo, acéptalo.' }
                else if (porcentaje <= 80) { nivel = 'Pansexual detectado.'; frase = 'Te gusta hasta el del frente, acéptalo bro.' }
                else { nivel = '100% Pansexual.'; frase = 'Te enamoras de todo lo que se mueva, confirmado.' }

            } else if (cmd === 'hetero') {
                titulo = '🧢 EL MEDIDOR HETERO'
                if (porcentaje <= 20) { nivel = 'Nada hetero.'; frase = 'Bro acéptalo, de hetero no tienes nada 💀' }
                else if (porcentaje <= 40) { nivel = 'Casi nada hetero.'; frase = 'Muy poco hetero, se te nota lo gay.' }
                else if (porcentaje <= 60) { nivel = 'Mitad hetero.'; frase = 'Un rato hetero un rato no, estás raro.' }
                else if (porcentaje <= 80) { nivel = 'Bastante hetero.'; frase = 'Por ahora estás safe bro, aún aguantas.' }
                else { nivel = '100% Hetero macho alfa.'; frase = 'Confirmado hetero, puro macho.' }

            } else if (cmd === 'trans') {
                titulo = '⚧️ EL MEDIDOR TRANS'
                if (porcentaje <= 20) { nivel = 'Nada trans.'; frase = 'Estás normal por ahora.' }
                else if (porcentaje <= 40) { nivel = 'Curiosidad trans.'; frase = 'Algo te llama la atención, acéptalo poco a poco.' }
                else if (porcentaje <= 60) { nivel = 'En transición.'; frase = 'Ya estás dudando bro, toca aceptarlo.' }
                else if (porcentaje <= 80) { nivel = 'Trans de closet.'; frase = 'Ya no lo escondas, acéptalo.' }
                else { nivel = '100% Trans.'; frase = 'Confirmado, ya saca tu peluca.' }

            } else { // bi / bisexual
                titulo = '💜 EL MEDIDOR BI'
                if (porcentaje <= 20) { nivel = 'Nada bi.'; frase = 'Na bro, tu eres de un solo bando.' }
                else if (porcentaje <= 40) { nivel = 'Un poquito bi.'; frase = 'Ya le miras a ambos, acéptalo.' }
                else if (porcentaje <= 60) { nivel = 'Bi confirmado a medias.'; frase = 'Te gustan los dos, ya acéptalo.' }
                else if (porcentaje <= 80) { nivel = 'Bi de closet.'; frase = 'Deja de negarlo bro, eres bi.' }
                else { nivel = '100% Bisexual.'; frase = 'Confirmado, le das a todo.' }
            }

            let text = `⚖️ *${titulo}* ⚖️\n\n`
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
            return sock.sendMessage(chat, { text: ' ✿ Error en medidor.' }, { quoted: m });
        }
    }
}