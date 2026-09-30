export default {
    command: ['setprefix'],
    description: 'Cambia el prefijo del grupo',
    category: 'admin',
    group: true,

    before: async (ctx) => {
        try {
            const chatId = ctx.chat || ctx.m?.chat || ctx.key?.remoteJid
            if (!chatId) return false
            const chatDB = global.db?.data?.chats?.[chatId]
            const customPrefix = chatDB?.customPrefix
            if (!customPrefix) return false

            let body = (ctx.body || ctx.text || '').trim()
            if (!body) return false

            // 1. Si usa el prefijo nuevo, lo convertimos a. para que el bot lo lea
            if (body.startsWith(customPrefix)) {
                const newBody = '.' + body.slice(customPrefix.length).trim()
                ctx.body = newBody
                ctx.text = newBody
                if (ctx.m) {
                    ctx.m.text = newBody
                    ctx.m.body = newBody
                }
                return false // deja pasar
            }

            // 2. Si usa el prefijo viejo "." y ya hay uno custom, lo bloqueamos
            if (body.startsWith('.')) {
                const cmd = body.slice(1).trim().split(' ')[0].toLowerCase()
                // siempre deja pasar setprefix para poder resetear
                if (cmd === 'setprefix') return false
                return true // bloquea el comando viejo
            }

            return false
        } catch { return false }
    },

    run: async ({ chat, m, sock, args, isAdmin, isOwner }) => {
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {}
        const dbChat = global.db.data.chats[chat]

        if (!isAdmin &&!isOwner) return m.reply('✿ Solo admins pueden cambiar el prefijo')

        if (!args[0]) {
            const actual = dbChat.customPrefix || '.'
            return sock.sendMessage(chat, {
                text: `⚙️ *Prefijo actual:* \`${actual}\`\n\n*Uso:*\n*.setprefix!* - Cambia a!\n*.setprefix reset* - Vuelve a.`
            }, { quoted: m })
        }

        if (['reset','borrar','default'].includes(args[0].toLowerCase())) {
            delete dbChat.customPrefix
            return sock.sendMessage(chat, { text: `✅ Prefijo reseteado a \`.\` ahora solo funciona con.` }, { quoted: m })
        }

        const newPrefix = args[0].trim()
        if (newPrefix.length > 2) return m.reply('❌ Solo 1 o 2 caracteres. Ej:!,#, $')

        dbChat.customPrefix = newPrefix
        return sock.sendMessage(chat, {
            text: `✅ *Prefijo cambiado a \`${newPrefix}\`*\n\nAhora SOLO funciona con \`${newPrefix}\`\nEj: \`${newPrefix}menu\`\nEl prefijo \`. \` ya no funcionará hasta hacer \`${newPrefix}setprefix reset\``
        }, { quoted: m })
    }
}
