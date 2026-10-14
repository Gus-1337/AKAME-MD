import axios from 'axios'
import { UserJid } from '#simple'

const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'
const STELLAR_KEY = 'proyectsV2'
const TIEMPO_RECLAMO = 60000

// Rarezas del gacha (probabilidad)
const RAREZAS = [
    { nombre: 'Común', icono: '⚪', peso: 50 },
    { nombre: 'Rara', icono: '🔵', peso: 30 },
    { nombre: 'Épica', icono: '🟣', peso: 15 },
    { nombre: 'Legendaria', icono: '🟡', peso: 5 }
]

// Waifu pendiente de reclamar por chat (compartido con .reclamar)
export const pendientes: Map<string, any> = (global as any).waifuPendientes || ((global as any).waifuPendientes = new Map())

const normalize = (x: string) => String(x).split('@')[0].split(':').pop()?.replace(/[^\d]/g, '') || ''

function tirarRareza() {
    const total = RAREZAS.reduce((s, r) => s + r.peso, 0)
    let n = Math.random() * total
    for (const r of RAREZAS) {
        if ((n -= r.peso) < 0) return r
    }
    return RAREZAS[0]
}

// Pide una waifu a Delirius. Repite si sale contenido NSFW o no hay imagen.
async function waifuDelirius(): Promise<{ id: any; image: string } | null> {
    for (let i = 0; i < 3; i++) {
        try {
            const { data } = await axios.get('https://api.delirius.online/anime/waifu', { timeout: 15000 })
            const d = data?.data
            if (d?.image && !d.nsfw) return { id: d.id, image: d.image }
        } catch {}
    }
    return null
}

export default {
    command: ['waifu', 'waifus', 'rw'],
    description: 'Tira una waifu del gacha (luego usa .reclamar)',
    category: 'anime',
    run: async ({ chat, m, sock, sender }: any) => {
        // UserJid es síncrona: devuelve el JID real del usuario
        const jid = UserJid(sock, chat, sender || m.sender) || sender || m.sender
        const dueno = normalize(jid)

        const activa = pendientes.get(chat)
        if (activa) {
            return sock.sendMessage(chat, {
                text: `💖 Ya hay una waifu esperando reclamo de @${activa.dueno}\n> Espera a que la reclame o pase el tiempo`,
                mentions: [activa.jid]
            }, { quoted: m })
        }

        await sock.sendMessage(chat, { react: { text: '💖', key: m.key } }).catch(() => null)

        try {
            const w = await waifuDelirius()
            // Respaldo: si Delirius falla, pide la imagen directa a Stellarwa
            const image = w?.image || `https://api.stellarwa.xyz/anime/waifu?apikey=${STELLAR_KEY}`
            const rareza = tirarRareza()
            const id = w?.id ?? Math.floor(Math.random() * 99999)

            const pendiente: any = { jid, dueno, image, id, rareza, timeout: null }
            pendiente.timeout = setTimeout(async () => {
                if (pendientes.get(chat) !== pendiente) return
                pendientes.delete(chat)
                await sock.sendMessage(chat, {
                    text: `💨 La waifu *#${id}* se escapó... nadie la reclamó a tiempo`
                }).catch(() => null)
            }, TIEMPO_RECLAMO)
            pendientes.set(chat, pendiente)

            await sock.sendMessage(chat, {
                image: { url: image },
                caption:
                    `💖 *WAIFU ENCONTRADA* 💖\n` +
                    `${LINEA}\n` +
                    `🆔 ID » *#${id}*\n` +
                    `${rareza.icono} Rareza » *${rareza.nombre}*\n` +
                    `👤 Para » @${dueno}\n` +
                    `${LINEA}\n` +
                    `> Responde *.reclamar* en 60s para guardarla`,
                mentions: [jid]
            }, { quoted: m })

            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null)
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null)
            return sock.sendMessage(chat, { text: '✿ No pude traer una waifu ahora, intenta de nuevo' }, { quoted: m })
        }
    }
}
