import axios from 'axios'

const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'
const STELLAR_KEY = 'proyectsV2'

// Pide una waifu a Delirius. Repite si sale contenido NSFW o no hay imagen.
async function waifuDelirius(): Promise<{ image: string; source?: string } | null> {
    for (let i = 0; i < 3; i++) {
        try {
            const { data } = await axios.get('https://api.delirius.online/anime/waifu', { timeout: 15000 })
            const d = data?.data
            if (d?.image && !d.nsfw) return { image: d.image, source: d.source }
        } catch {}
    }
    return null
}

export default {
    command: ['waifu', 'waifus'],
    description: 'Envía una waifu aleatoria',
    category: 'anime',
    run: async ({ chat, m, sock }: any) => {
        await sock.sendMessage(chat, { react: { text: '💖', key: m.key } }).catch(() => null)

        try {
            const w = await waifuDelirius()
            // Respaldo: si Delirius falla, pide la imagen directa a Stellarwa
            const image = w?.image || `https://api.stellarwa.xyz/anime/waifu?apikey=${STELLAR_KEY}`

            await sock.sendMessage(chat, {
                image: { url: image },
                caption:
                    `💖 *Waifu aleatoria*\n` +
                    `${LINEA}\n` +
                    (w?.source ? `> 🔗 ${w.source}` : `> ✨ Así de bonita`)
            }, { quoted: m })

            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null)
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null)
            return sock.sendMessage(chat, { text: '✿ No pude traer una waifu ahora, intenta de nuevo' }, { quoted: m })
        }
    }
}
