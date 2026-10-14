import { UserJid } from '#simple'

const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'
const MAX_LISTA = 25

const iconos: Record<string, string> = { 'Común': '⚪', 'Rara': '🔵', 'Épica': '🟣', 'Legendaria': '🟡' }

export default {
    command: ['pokemones', 'pokes', 'mispokemon'],
    description: 'Muestra tu colección de Pokémon en este chat',
    category: 'anime',
    run: async ({ chat, m, sock, sender }: any) => {
        const jid = UserJid(sock, chat, sender || m.sender) || sender || m.sender
        const usuario = (global as any).db?.data?.chats?.[chat]?.users?.[jid]
        const lista: any[] = Array.isArray(usuario?.pokemon) ? usuario.pokemon : []

        if (!lista.length) {
            return sock.sendMessage(chat, {
                text: `🌿 Aún no tienes Pokémon\n> Usa *.pk* para encontrar uno y *.cpk* para atraparlo`,
                mentions: [jid]
            }, { quoted: m })
        }

        const ordenados = [...lista].sort((a, b) => (b.uid || 0) - (a.uid || 0)).slice(0, MAX_LISTA)
        const filas = ordenados.map(p =>
            `#${p.uid} · *${p.nombre}* ${iconos[p.rareza] || '⚪'}`
        )
        const extra = lista.length > MAX_LISTA ? `\n… y ${lista.length - MAX_LISTA} más` : ''

        return sock.sendMessage(chat, {
            text:
                `˚₊· ͟͟͞͞➳❥ *Colección de @${jid.split('@')[0]}*\n` +
                `${LINEA}\n` +
                `🌿 Total » *${lista.length}* Pokémon\n` +
                `${LINEA}\n` +
                filas.join('\n') + extra + `\n${LINEA}\n` +
                `> Vender o liberar uno: *.venderpk <número>*`,
            mentions: [jid]
        }, { quoted: m })
    }
}
