import { UserJid } from '#simple'
import { saveDB } from '#db'
import config from '#config'

const coinName = (config as any)?.coin || 'coins'
const fmt = (n: number) => n.toLocaleString('es-PE')

export default {
    command: ['venderpk', 'liberarpk', 'soltarpk'],
    description: 'Vende o libera un Pokémon de tu colección (recibes la mitad del valor)',
    category: 'anime',
    run: async ({ chat, m, sock, sender, args }: any) => {
        const jid = UserJid(sock, chat, sender || m.sender) || sender || m.sender
        const numero = Number(String(args[0] || '').replace('#', ''))

        if (!numero) {
            return sock.sendMessage(chat, {
                text: `✿ Usa: *.venderpk <número>*\n> Mira tus números con *.pokemones*`
            }, { quoted: m })
        }

        const db = (global as any).db?.data
        const usuario = db?.chats?.[chat]?.users?.[jid]
        const lista: any[] = Array.isArray(usuario?.pokemon) ? usuario.pokemon : []
        const pokemon = lista.find(p => p.uid === numero)

        if (!pokemon) {
            return sock.sendMessage(chat, {
                text: `✿ No tienes un Pokémon con el número *#${numero}*\n> Mira tu colección con *.pokemones*`
            }, { quoted: m })
        }

        // Recibe la mitad del valor
        const pago = Math.floor((Number(pokemon.valor) || 0) / 2)
        usuario.pokemon = lista.filter(p => p.uid !== numero)
        usuario.coins = (Number(usuario.coins) || 0) + pago
        saveDB(chat, jid)

        return sock.sendMessage(chat, {
            text:
                `˚₊· ͟͟͞͞➳❥ *Pokémon vendido*\n\n` +
                `> Liberaste a *${pokemon.nombre}* #${numero}\n\n` +
                `✧ Recibiste › *${fmt(pago)}* ${coinName}\n` +
                `✿ Saldo › *${fmt(usuario.coins + (Number(usuario.bank) || 0))}* ${coinName}\n` +
                `✿ Te quedan › *${usuario.pokemon.length}* Pokémon`,
            mentions: [jid]
        }, { quoted: m })
    }
}
