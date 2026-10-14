import { UserJid } from '#simple'
import { saveDB } from '#db'

const pendientes: Map<string, any> = (global as any).waifuPendientes || ((global as any).waifuPendientes = new Map())
const normalize = (x: string) => String(x).split('@')[0].split(':').pop()?.replace(/[^\d]/g, '') || ''

export default {
    command: ['reclamar', 'claim', 'c'],
    description: 'Reclama la waifu que acabas de encontrar con .rw',
    category: 'anime',
    run: async ({ chat, m, sock, sender }: any) => {
        const pendiente = pendientes.get(chat)
        if (!pendiente) {
            return sock.sendMessage(chat, { text: '✿ No hay ninguna waifu para reclamar ahora\n> Usa *.rw* para buscar una' }, { quoted: m })
        }

        // UserJid es síncrona: devuelve el JID real del usuario
        const jid = UserJid(sock, chat, sender || m.sender) || sender || m.sender
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

        if (usuario.characters.some((c: any) => c.id === pendiente.id)) {
            return sock.sendMessage(chat, { text: `💖 Ya tienes la waifu *#${pendiente.id}* en tu harem` }, { quoted: m })
        }

        usuario.characters.push({
            id: pendiente.id,
            rareza: pendiente.rareza.nombre,
            valor: pendiente.rareza.valor,
            image: pendiente.image,
            fecha: Date.now()
        })
        saveDB(chat, jid)

        return sock.sendMessage(chat, {
            text:
                `˚₊· ͟͟͞͞➳❥ *Waifu reclamada*\n\n` +
                `> ¡Felicidades, ya es tuya!\n\n` +
                `✧ Valor › *${pendiente.rareza.valor.toLocaleString('es-PE')}* yenes\n` +
                `✦ Serie › *Anime*\n` +
                `✩ Género › *Femenino*\n` +
                `❖ Estado › *Reclamada*\n` +
                `✿ Harem › *${usuario.characters.length}* personajes`,
            mentions: [jid]
        }, { quoted: m })
    }
}
