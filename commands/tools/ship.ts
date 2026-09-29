export default {
    command: ['ship', 'shippear', 'pareja'],
    description: 'Ship bacano',
    category: 'tools',
    run: async ({ chat, m, sock }) => {
        // ESTA FUNCION SI LEE EL @
        const getMentions = () => {
            let jids = []
            // @ del mensaje
            if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid) {
                jids = m.message.extendedTextMessage.contextInfo.mentionedJid
            } else if (m.message?.imageMessage?.contextInfo?.mentionedJid) {
                jids = m.message.imageMessage.contextInfo.mentionedJid
            } else if (m.mentionedJid?.length) {
                jids = m.mentionedJid
            }
            // texto escrito tipo 519...
            const text = m.text || m.body || ''
            const numberRegex = /@(\d+)/g
            let match
            while ((match = numberRegex.exec(text))!== null) {
                let num = match[1] + '@s.whatsapp.net'
                if (!jids.includes(num)) jids.push(num)
            }
            return jids
        }

        let mentions = getMentions()
        let users: string[] = []

        if (mentions.length >= 2) users = mentions.slice(0, 2)
        else if (mentions.length === 1) users = [m.sender, mentions[0]]
        else {
            // si responde a alguien
            if ((m as any).quoted?.sender) {
                users = [m.sender, (m as any).quoted.sender]
            } else {
                try {
                    let meta = await sock.groupMetadata(chat)
                    let parts = meta.participants.map(p => p.id).filter(id => id!== m.sender)
                    let r = parts[Math.floor(Math.random() * parts.length)]
                    users = [m.sender, r]
                } catch { users = [m.sender, m.sender] }
            }
        }

        let [user1, user2] = users
        if (user1 === user2) { // evita Gus+Gus
            try {
                let meta = await sock.groupMetadata(chat)
                let parts = meta.participants.map(p => p.id).filter(id => id!== user1)
                if (parts.length) user2 = parts[Math.floor(Math.random() * parts.length)]
            } catch {}
        }

        let porcentaje = Math.floor(Math.random() * 101)
        let besos = Math.floor(Math.random() * 101)
        let peleas = Math.floor(Math.random() * 101)
        let fidelidad = Math.floor(Math.random() * 101)
        let futuro = ['Se casan en 3 meses 💍', 'Van a terminar mal 💔', 'Toca boda privada', 'Van a tener 2 hijos 👶', 'Puro cacho nomás 🤡', 'Amor eterno 🔥'][Math.floor(Math.random() * 6)]

        let nivel = '', frase = '', emoji = ''
        if (porcentaje <= 20) { nivel = 'Nada que ver'; frase = 'Ni con brujería pegan esos dos.'; emoji = '💀' }
        else if (porcentaje <= 40) { nivel = 'Poquita química'; frase = 'Uno está más ilusionado que el otro.'; emoji = '🤏' }
        else if (porcentaje <= 60) { nivel = 'Buena pareja'; frase = 'Se ven bien juntos, dense un beso ya.'; emoji = '💕' }
        else if (porcentaje <= 80) { nivel = 'Pareja perfecta'; frase = 'Bro ya son novios y no lo aceptan.'; emoji = '🥰' }
        else { nivel = 'ALMAS GEMELAS'; frase = 'Ya cásense, están hechos el uno para el otro.'; emoji = '❤️‍🔥' }

        let pp1; try{pp1=await sock.profilePictureUrl(user1,'image')}catch{pp1='https://telegra.ph/file/24fa902ead26340f3df2c.png'}

        let text = `*${emoji} S H I P ${emoji}*\n\n`
        text += `💘 @${user1.split('@')[0]} + @${user2.split('@')[0]}\n\n`
        text += `❤️ Amor: *${porcentaje}%*\n`
        text += `💋 Besos: *${besos}%*\n`
        text += `😡 Peleas: *${peleas}%*\n`
        text += `💍 Fidelidad: *${fidelidad}%*\n\n`
        text += `🔮 Futuro: ${futuro}\n`
        text += `💬 Estado: ${nivel}\n\n`
        text += `> ${frase}`

        return await sock.sendMessage(chat, {
            image: { url: pp1 },
            caption: text,
            mentions: [user1, user2]
        }, { quoted: m })
    }
}