import { UserJid } from '#simple'
import { saveDB } from '#db'
import config from '#config'

const coinName = (config as any)?.coin || 'coins'
const pokePendientes: Map<string, any> = (global as any).pokePendientes || ((global as any).pokePendientes = new Map())
const normalize = (x: string) => String(x).split('@')[0].split(':').pop()?.replace(/[^\d]/g, '') || ''
const fmt = (n: number) => n.toLocaleString('es-PE')

export default {
    command: ['cpk', 'atrapar', 'reclamarpk'],
    description: 'Atrapa el Pokémon que apareció con .pk',
    category: 'anime',
    run: async ({ chat, m, sock, sender }: any) => {
        const pendiente = pokePendientes.get(chat)
        if (!pendiente) {
            return sock.sendMessage(chat, { text: '✿ No hay ningún Pokémon para atrapar ahora\n> Usa *.pk* para buscar uno' }, { quoted: m })
        }

        // UserJid es síncrona: devuelve el JID real del usuario
        const jid = UserJid(sock, chat, sender || m.sender) || sender || m.sender
        // Solo quien lo encontró puede atraparlo. A los demás se les ignora.
        if (normalize(jid) !== pendiente.dueno) return

        const db = (global as any).db?.data
        if (!db.chats) db.chats = {}
        if (!db.chats[chat]) db.chats[chat] = {}
        if (!db.chats[chat].users) db.chats[chat].users = {}
        if (!db.chats[chat].users[jid]) db.chats[chat].users[jid] = {}
        const usuario = db.chats[chat].users[jid]
        if (!Array.isArray(usuario.pokemon)) usuario.pokemon = []

        const valor = pendiente.valor
        const efectivo = Number(usuario.coins) || 0
        const banco = Number(usuario.bank) || 0
        const total = efectivo + banco

        // Mismo saldo que muestra .bal (efectivo + banco)
        if (total < valor) {
            return sock.sendMessage(chat, {
                text:
                    `˚₊· ͟͟͞͞➳❥ *Saldo insuficiente*\n\n` +
                    `> No te alcanza para atrapar a *${pendiente.nombre}*.\n\n` +
                    `✧ Valor › *${fmt(valor)}* ${coinName}\n` +
                    `✦ Tu saldo › *${fmt(total)}* ${coinName}\n` +
                    `✩ Te faltan › *${fmt(valor - total)}* ${coinName}\n\n` +
                    `✐ Revisa tu saldo con *.bal*`,
                mentions: [jid]
            }, { quoted: m })
        }

        clearTimeout(pendiente.timeout)
        pokePendientes.delete(chat)

        // Descuenta primero del efectivo y lo que falte, del banco
        const deEfectivo = Math.min(efectivo, valor)
        usuario.coins = efectivo - deEfectivo
        usuario.bank = banco - (valor - deEfectivo)

        // Número único por Pokémon del usuario, para liberarlo después
        const uid = (usuario.pokemon.reduce((mx: number, p: any) => Math.max(mx, p.uid || 0), 0)) + 1
        usuario.pokemon.push({
            uid,
            id: pendiente.id,
            nombre: pendiente.nombre,
            tipos: pendiente.tipos,
            rareza: pendiente.rareza,
            valor,
            imagen: pendiente.imagen,
            fecha: Date.now()
        })
        saveDB(chat, jid)

        return sock.sendMessage(chat, {
            text:
                `˚₊· ͟͟͞͞➳❥ *Pokémon atrapado*\n\n` +
                `> ¡Lo atrapaste!\n\n` +
                `✧ Pokémon › *${pendiente.nombre}* #${String(pendiente.id).padStart(3, '0')}\n` +
                `✦ Tipo › *${pendiente.tipos}*\n` +
                `✩ Pagaste › *${fmt(valor)}* ${coinName}\n` +
                `❖ Número › *#${uid}*\n` +
                `✿ Saldo › *${fmt(usuario.coins + usuario.bank)}* ${coinName}\n\n` +
                `> Mira tu colección con *.pokemones*`,
            mentions: [jid]
        }, { quoted: m })
    }
}
