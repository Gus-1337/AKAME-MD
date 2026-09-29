export default {
    command: ['bot'],
    description: 'Prende y apaga el bot en el grupo',
    category: 'admin',
    group: true,
    // antes de que se ejecute cualquier comando, chequea si está apagado
    before: async (ctx) => {
        const chatId = ctx.chat || ctx.m?.chat || ctx.key?.remoteJid
        if (!chatId?.endsWith('@g.us')) return false
        const chatDB = global.db?.data?.chats?.[chatId]
        if (!chatDB?.isBanned) return false

        const text = (ctx.body || ctx.text || '').toLowerCase().trim()
        // si está apagado, solo deja pasar.bot on y.bot
        if (text.startsWith('.bot on') || text === '.bot on' || text === '.bot' || text.startsWith('.boton')) {
            return false
        }
        return true // bloquea todo
    },
    run: async ({ chat, m, sock, args, isAdmin, isOwner }) => {
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {}
        const dbChat = global.db.data.chats[chat]

        if (!isAdmin &&!isOwner) return m.reply('✿ Solo admins pueden usar esto')

        let action = args[0]?.toLowerCase()
        if (!action) {
            return sock.sendMessage(chat, {
                text: `🤖 Bot en este grupo: ${dbChat.isBanned? '🔴 *APAGADO*' : '🟢 *ENCENDIDO*'}\n\n*.bot on* - Encender\n*.bot off* - Apagar`
            }, { quoted: m })
        }

        if (['on', 'encender', 'activar'].includes(action)) {
            if (!dbChat.isBanned) return m.reply('🟢 Ya estoy encendido')
            dbChat.isBanned = false
            return sock.sendMessage(chat, { text: '🟢 *Bot encendido en este grupo* ✅ Ya respondo de nuevo.' }, { quoted: m })
        }

        if (['off', 'apagar', 'desactivar'].includes(action)) {
            if (dbChat.isBanned) return m.reply('🔴 Ya estoy apagado')
            dbChat.isBanned = true
            return sock.sendMessage(chat, { text: '🔴 *Bot apagado en este grupo*\n\nYa no responderé hasta que usen *.bot on*' }, { quoted: m })
        }
    }
    }
