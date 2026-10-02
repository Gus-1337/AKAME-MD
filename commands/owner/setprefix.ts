export default {
    command: ['setprefix'],
    description: 'Cambia el prefijo del grupo',
    category: 'owner',
    group: true,
    owner: true,

    before: async (ctx) => {
        try {
            const chatId = ctx.chat || ctx.m?.chat || ctx.key?.remoteJid
            if (!chatId) return false
            const chatDB = global.db?.data?.chats?.[chatId]
            const customPrefix = chatDB?.customPrefix
            if (!customPrefix) return false

            let body = (ctx.body || ctx.text || '').trim()
            if (!body) return false

            if (body.startsWith(customPrefix)) {
                const newBody = '.' + body.slice(customPrefix.length).trim()
                ctx.body = newBody
                ctx.text = newBody
                if (ctx.m) {
                    ctx.m.text = newBody
                    ctx.m.body = newBody
                }
                return false
            }

            if (body.startsWith('.')) {
                const cmd = body.slice(1).trim().split(' ')[0].toLowerCase()
                if (cmd === 'setprefix') return false
                return true
            }

            return false
        } catch { return false }
    },

    run: async ({ chat, m, sock, args }) => {
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {}
        const dbChat = global.db.data.chats[chat]

        if (!args[0]) {
            const actual = dbChat.customPrefix || '.'
            return sock.sendMessage(chat, {
                text: `⚙️ *Prefijo actual:* \`${actual}\`\n\n*Uso:*\n*.setprefix!* - Cambia a!\n*.setprefix reset* - Vuelve a.`
            }, { quoted: m })
        }

        if (['reset','borrar','default'].includes(args[0].toLowerCase())) {
            delete dbChat.customPrefix
            return sock.sendMessage(chat, { text: `✅ Prefijo reseteado a \`.\`` }, { quoted: m })
        }

        const newPrefix = args[0].trim()
        if (newPrefix.length > 2) return m.reply('❌ Solo 1 o 2 caracteres. Ej:!, #, $')

        dbChat.customPrefix = newPrefix
        return sock.sendMessage(chat, {
            text: `✅ *Prefijo cambiado a \`${newPrefix}\`*\n\nAhora SOLO funciona con \`${newPrefix}\`\nEj: \`${newPrefix}menu\``
        }, { quoted: m })
    }
                        }
