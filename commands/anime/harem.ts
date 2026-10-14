import { UserJid } from '#simple'

const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'
const MAX_LISTA = 25

const iconos: Record<string, string> = {
    'Común': '⚪',
    'Rara': '🔵',
    'Épica': '🟣',
    'Legendaria': '🟡'
}

const fecha = (ms: number) =>
    new Date(ms).toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' })

export default {
    command: ['harem', 'mywaifus', 'misswaifus'],
    description: 'Muestra las waifus que has reclamado en este chat',
    category: 'gacha',
    run: async ({ chat, m, sock, sender }: any) => {
        const reply = (text: string, mentions?: string[]) =>
            sock.sendMessage(chat, mentions ? { text, mentions } : { text }, { quoted: m })

        const jid = UserJid(sock, chat, sender || m.sender) || sender || m.sender
        const usuario = (global as any).db?.data?.chats?.[chat]?.users?.[jid]
        const lista: any[] = Array.isArray(usuario?.characters) ? usuario.characters : []

        if (!lista.length) {
            return reply(
                `💔 Aún no tienes waifus en tu harem\n` +
                `> Usa *.rw* para tirar una y *.reclamar* para guardarla`,
                [jid]
            )
        }

        const ordenadas = [...lista].sort((a, b) => (b.fecha || 0) - (a.fecha || 0))
        const mostradas = ordenadas.slice(0, MAX_LISTA)
        const filas = mostradas.map((w, i) =>
            `${i + 1}. ${iconos[w.rareza] || '⚪'} *#${w.id}* · ${w.rareza || 'Común'}${w.fecha ? ` · ${fecha(w.fecha)}` : ''}`
        )
        const extra = lista.length > MAX_LISTA ? `\n… y ${lista.length - MAX_LISTA} más` : ''

        return reply(
            `💝 *HAREM DE @${jid.split('@')[0]}* 💝\n` +
            `${LINEA}\n` +
            `💖 Total » *${lista.length}* waifus\n` +
            `${LINEA}\n` +
            filas.join('\n') + extra,
            [jid]
        )
    }
}
