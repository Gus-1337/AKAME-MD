import { UserJid } from '#simple'
import { saveDB } from '#db'
import config from '#config'

const coinName = (config as any)?.coin || 'coins'
const pendientes: Map<string, any> = (global as any).waifuPendientes || ((global as any).waifuPendientes = new Map())
const normalize = (x: string) => String(x).split('@')[0].split(':').pop()?.replace(/[^\d]/g, '') || ''
const fmt = (n: number) => n.toLocaleString('es-PE')

export default {
    command: ['reclamar', 'claim', 'c'],
    description: 'Reclama la waifu que acabas de encontrar con .rw',
    category: 'gacha',
    run: async ({ chat, m, sock, sender }: any) => {
        const pendiente = pendientes.get(chat)
        if (!pendiente) {
            return sock.sendMessage(chat, { text: '✿ No hay ninguna waifu para reclamar ahora\n> Usa *.rw* para buscar una' }, { quoted: m })
        }

        // UserJid es síncrona: devuelve el JID real del usuario
        const jid = UserJid(sock, chat, sender || m.sender) || sender || m.sender
        // Solo quien encontró la waifu puede reclamarla. A los demás se les ignora.
        if (normalize(jid) !== pendiente.dueno) return

        const db = (global as any).db?.data
        if (!db.chats) db.chats = {}
        if (!db.chats[chat]) db.chats[chat] = {}
        if (!db.chats[chat].users) db.chats[chat].users = {}
        if (!db.chats[chat].users[jid]) db.chats[chat].users[jid] = {}
        const usuario = db.chats[chat].users[jid]
        if (!Array.isArray(usuario.characters)) usuario.characters = []

        const valor = pendiente.rareza.valor
        const efectivo = Number(usuario.coins) || 0
        const banco = Number(usuario.bank) || 0
        const total = efectivo + banco

        // Mismo saldo que muestra .bal (efectivo + banco)
        if (total < valor) {
            return sock.sendMessage(chat, {
                text:
                    `˚₊· ͟͟͞͞➳❥ *Saldo insuficiente*\n\n` +
                    `> No te alcanza para reclamarla.\n\n` +
                    `✧ Valor › *${fmt(valor)}* ${coinName}\n` +
                    `✦ Tu saldo › *${fmt(total)}* ${coinName}\n` +
                    `✩ Te faltan › *${fmt(valor - total)}* ${coinName}\n\n` +
                    `✐ Revisa tu saldo con *.bal*`,
                mentions: [jid]
            }, { quoted: m })
        }

        if (usuario.characters.some((c: any) => c.id === pendiente.id)) {
            return sock.sendMessage(chat, { text: `💖 Ya tienes la waifu *#${pendiente.id}* en tu harem` }, { quoted: m })
        }

        clearTimeout(pendiente.timeout)
        pendientes.delete(chat)

        // Descuenta primero del efectivo y lo que falte, del banco
        const deEfectivo = Math.min(efectivo, valor)
        usuario.coins = efectivo - deEfectivo
        usuario.bank = banco - (valor - deEfectivo)

        usuario.characters.push({
            id: pendiente.id,
            rareza: pendiente.rareza.nombre,
            valor,
            image: pendiente.image,
            fecha: Date.now()
        })
        saveDB(chat, jid)

        return sock.sendMessage(chat, {
            text:
                `˚₊· ͟͟͞͞➳❥ *Waifu reclamada*\n\n` +
                `> ¡Felicidades, ya es tuya!\n\n` +
                `✧ Pagaste › *${fmt(valor)}* ${coinName}\n` +
                `✦ Serie › *Anime*\n` +
                `✩ Género › *Femenino*\n` +
                `❖ Estado › *Reclamada*\n` +
                `✿ Saldo › *${fmt(usuario.coins + usuario.bank)}* ${coinName}\n` +
                `✿ Harem › *${usuario.characters.length}* personajes`,
            mentions: [jid]
        }, { quoted: m })
    }
}
