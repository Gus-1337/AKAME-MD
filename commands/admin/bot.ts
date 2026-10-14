import config from '#config';

const ON = ['on', 'encender', 'activar'];
const OFF = ['off', 'apagar', 'desactivar'];

// Nombre con el que se presenta el bot que está respondiendo (en un subbot, el nombre de su dueño)
const nombreBot = () => (globalThis as any).botName || (config as any).botName || 'AKAME-MD';

const linea = (texto: string) => `《✧》 ${texto}`;

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
        // si está apagado, solo deja pasar .bot, .bot on y .boton
        if (text.startsWith('.bot on') || text === '.bot on' || text === '.bot' || text.startsWith('.boton')) {
            return false
        }
        return true // bloquea todo
    },
    run: async ({ chat, m, sock, args, isAdmin, isOwner }) => {
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {}
        const dbChat = global.db.data.chats[chat]
        const nombre = nombreBot()

        if (!isAdmin && !isOwner) {
            return sock.sendMessage(chat, { text: linea(`Solo *admins* pueden usar esto en este grupo.`) }, { quoted: m })
        }

        const action = args[0]?.toLowerCase()

        if (!action) {
            const estado = dbChat.isBanned ? '🔴 *Desactivado*' : '🟢 *Activado*'
            return sock.sendMessage(chat, {
                text: [
                    linea(`Estado de *${nombre}* en este grupo: ${estado}`),
                    '',
                    '> *.bot on* — activar',
                    '> *.bot off* — desactivar'
                ].join('\n')
            }, { quoted: m })
        }

        if (ON.includes(action)) {
            if (!dbChat.isBanned) {
                return sock.sendMessage(chat, { text: linea(`*${nombre}* ya está *Activado* en este grupo.`) }, { quoted: m })
            }
            dbChat.isBanned = false
            return sock.sendMessage(chat, {
                text: [
                    linea(`Has *Activado* a *${nombre}* en este grupo.`),
                    '> Ya responde de nuevo a los miembros.'
                ].join('\n')
            }, { quoted: m })
        }

        if (OFF.includes(action)) {
            if (dbChat.isBanned) {
                return sock.sendMessage(chat, { text: linea(`*${nombre}* ya está *Desactivado* en este grupo.`) }, { quoted: m })
            }
            dbChat.isBanned = true
            return sock.sendMessage(chat, {
                text: [
                    linea(`Has *Desactivado* a *${nombre}* en este grupo.`),
                    '> A partir de ahora solo *un admin* pueden reactivarlo.'
                ].join('\n')
            }, { quoted: m })
        }

        return sock.sendMessage(chat, {
            text: linea('Usa *.bot on* para activar o *.bot off* para desactivar.')
        }, { quoted: m })
    }
}
