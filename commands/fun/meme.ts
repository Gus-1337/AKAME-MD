import axios from 'axios'

// Fuente: meme-api.com (Reddit). Primero memes en español; si falla, pasa al siguiente.
const FUENTES = ['memesespanol', 'MemesEnEspanol', ''];
const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'
const IMG = /\.(jpe?g|png|webp)(\?.*)?$/i

async function pedirMeme(sub: string): Promise<any | null> {
    const url = sub ? `https://meme-api.com/gimme/${sub}` : 'https://meme-api.com/gimme'
    try {
        // Pide hasta 3 veces para evitar videos, GIFs o contenido NSFW
        for (let i = 0; i < 3; i++) {
            const { data } = await axios.get(url, { timeout: 10000 })
            if (data?.url && IMG.test(data.url) && !data.nsfw) return data
        }
    } catch {}
    return null
}

export default {
    command: ['meme', 'memes'],
    description: 'Envía un meme aleatorio en español',
    category: 'fun',
    run: async ({ chat, m, sock }) => {
        await sock.sendMessage(chat, { react: { text: '😂', key: m.key } }).catch(() => null)

        let meme: any = null
        for (const sub of FUENTES) {
            meme = await pedirMeme(sub)
            if (meme) break
        }

        if (!meme) {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null)
            return sock.sendMessage(chat, { text: '😵 No encontré memes ahora, intenta de nuevo' }, { quoted: m })
        }

        const titulo = String(meme.title || 'Meme').slice(0, 150)
        await sock.sendMessage(chat, {
            image: { url: meme.url },
            caption:
                `😂 *${titulo}*\n` +
                `${LINEA}\n` +
                `📌 r/${meme.subreddit}  ·  👍 ${meme.ups ?? 0}`
        }, { quoted: m })

        await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null)
    }
}
