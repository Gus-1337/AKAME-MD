import { UserJid } from '#simple'
import { saveDB } from '#db'

const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'

const pendientes: Map<string, any> = (global as any).waifuPendientes || ((global as any).waifuPendientes = new Map())
const normalize = (x: string) => String(x).split('@')[0].split(':').pop()?.replace(/[^\d]/g, '') || ''

export default {
    command: ['reclamar', 'claim'],
    description: 'Reclama la waifu que acabas de encontrar con .waifu',
    category: 'anime',
    group: true,
    run: async ({ chat, m, sock, sender }: any) => {
        const pendiente = pendientes.get(chat)
        if (!pendiente) {
            return sock.sendMessage(chat, { text: '✿ No hay ninguna waifu para reclamar ahora\n> Usa *.waifu* para buscar una' }, { quoted: m })
        }

        const jid = await UserJid(sock, chat, sender || m.sender).catch(() => sender || m.sender)
        // Solo quien encontró la waifu puede reclamarla. A los demás se les ignora.
        if (normalize(jid) !== pendiente.dueno) return

        clearTimeout(pendiente.timeout)
        pendientes.delete(chat)

        const db = (global as any).db?.data
        if (!db.chats) db.chats = {}
        if (!db.chats[chat]) db.chats[chat] = {}
        if (!db.chats[chat].users) db.chats[chat].users = {}
        if (!db.chats[chat].users[jid]) db.chats[chat].users[jid] = {}
        const usuario = db.chats[chat].users[jid]
        if (!Array.isArray(usuario.characters)) usuario.characters = []

        const yaLaTiene = usuario.characters.some((c: any) => c.id === pendiente.id)
        if (yaLaTiene) {
            return sock.sendMessage(chat, { text: `💖 Ya tienes la waifu *#${pendiente.id}* en tu harem` }, { quoted: m })
        }

        usuario.characters.push({
            id: pendiente.id,
            rareza: pendiente.rareza.nombre,
            image: pendiente.image,
            fecha: Date.now()
        })
        saveDB(chat, jid)

        return sock.sendMessage(chat, {
            text:
                `💞 *WAIFU RECLAMADA* 💞\n` +
                `${LINEA}\n` +
                `🆔 ID » *#${pendiente.id}*\n` +
                `${pendiente.rareza.icono} Rareza » *${pendiente.rareza.nombre}*\n` +
                `💝 Harem » *${usuario.characters.length}* personajes\n` +
                `${LINEA}\n` +
                `> ¡Felicidades, ya es tuya!`,
            mentions: [jid]
        }, { quoted: m })
    }
}
