import axios from 'axios'
import fs from 'fs'
import path from 'path'

// Subreddits en español/latino. meme-api devuelve hasta 50 memes por pedido,
// así que se juntan varios subs para tener un grupo grande donde elegir.
const SUBS = ['memesespanol', 'MemesEspanol', 'MemesMexicanos', 'MemesEnEspanol']
const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'
const IMG = /\.(jpe?g|png|webp)(\?.*)?$/i
const HISTORIAL_MAX = 300
const ARCHIVO = path.join(process.cwd(), 'database', 'memes-enviados.json')

type Meme = { url: string; title?: string; subreddit?: string; nsfw?: boolean }

function leerHistorial(): string[] {
    try { return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')) } catch { return [] }
}

function guardarHistorial(lista: string[]) {
    try {
        fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true })
        fs.writeFileSync(ARCHIVO, JSON.stringify(lista.slice(-HISTORIAL_MAX)))
    } catch {}
}

async function pedirLote(sub: string): Promise<Meme[]> {
    try {
        const { data } = await axios.get(`https://meme-api.com/gimme/${sub}/50`, { timeout: 12000 })
        return (data?.memes || []) as Meme[]
    } catch {
        return []
    }
}

// Respaldo: PopCat, de uno en uno
async function pedirPopcat(): Promise<Meme | null> {
    try {
        const { data } = await axios.get('https://api.popcat.xyz/v2/meme', { timeout: 10000 })
        const msg = data?.message
        if (!msg?.content?.image || msg.misc?.nsfw) return null
        return { url: msg.content.image, title: msg.title, subreddit: msg.subreddit }
    } catch {
        return null
    }
}

async function elegirMeme(): Promise<Meme | null> {
    const enviados = new Set(leerHistorial())
    const lotes = await Promise.all(SUBS.map(pedirLote))

    const vistos = new Set<string>()
    const pool = lotes.flat().filter((x) => {
        if (!x?.url || vistos.has(x.url)) return false
        vistos.add(x.url)
        return IMG.test(x.url) && !x.nsfw
    })

    const nuevos = pool.filter((x) => !enviados.has(x.url))
    const lista = nuevos.length ? nuevos : pool   // si ya se mandaron todos, se repite
    if (lista.length) return lista[Math.floor(Math.random() * lista.length)]

    return await pedirPopcat()
}

export default {
    command: ['meme', 'memes'],
    description: 'Envía un meme aleatorio en español',
    category: 'fun',
    run: async ({ chat, m, sock }: any) => {
        await sock.sendMessage(chat, { react: { text: '😂', key: m.key } }).catch(() => null)

        const meme = await elegirMeme()

        if (!meme) {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null)
            return sock.sendMessage(chat, { text: '😵 No encontré memes ahora, intenta de nuevo' }, { quoted: m })
        }

        // Recuerda el meme para no repetirlo pronto
        guardarHistorial([...leerHistorial(), meme.url])

        const titulo = String(meme.title || 'Meme').slice(0, 150)
        const origen = meme.subreddit ? `r/${meme.subreddit}` : 'Reddit'
        await sock.sendMessage(chat, {
            image: { url: meme.url },
            caption:
                `😂 *${titulo}*\n` +
                `${LINEA}\n` +
                `> 🎭 Meme de ${origen}`
        }, { quoted: m })

        await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null)
    }
}
