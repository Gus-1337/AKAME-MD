// Versículos de la Biblia. La clave viene de la variable de entorno NYX_KEY (no va en el código).
// El texto original sale en inglés y se traduce al español.

const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄'
const BASE = 'https://nyxdlapi.vercel.app/api/bible'
const MAX_VERSICULOS = 8

async function pedir(ruta: string, params: Record<string, string> = {}) {
    const qs = new URLSearchParams({ ...params, apikey: process.env.NYX_KEY || '' }).toString()
    const res = await fetch(`${BASE}/${ruta}?${qs}`, { signal: AbortSignal.timeout(15000) })
    const data: any = await res.json().catch(() => null)
    if (!res.ok || !data?.status || !data?.result) throw new Error(data?.message || `HTTP ${res.status}`)
    return data.result
}

async function traducir(texto: string): Promise<string> {
    try {
        const qs = new URLSearchParams({ text: texto, language: 'es' }).toString()
        const res = await fetch(`https://api.delirius.online/tools/translate?${qs}`, { signal: AbortSignal.timeout(15000) })
        const data: any = await res.json()
        return data?.status && data?.data ? String(data.data) : texto
    } catch {
        return texto
    }
}

// Convierte un resultado (uno o varios versículos) en lista { ref, texto }
function listar(result: any): { ref: string; texto: string }[] {
    const versos = Array.isArray(result?.verses) ? result.verses : [result]
    return versos.slice(0, MAX_VERSICULOS).map((v: any) => ({ ref: v.reference, texto: v.text }))
}

async function formatear(titulo: string, items: { ref: string; texto: string }[]) {
    const trad = await Promise.all(items.map(async i => ({
        ref: await traducir(i.ref),
        texto: await traducir(i.texto)
    })))
    const cuerpo = trad.map(i => `📖 *${i.ref}*\n“${i.texto}”`).join(`\n\n`)
    return `✝️ *${titulo}*\n${LINEA}\n${cuerpo}\n${LINEA}\n> Usa *.biblia Juan 3:16* para buscar otro`
}

export default {
    command: ['biblia', 'versiculo'],
    description: 'Busca un versículo o pide uno al azar / del día',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        const reply = (text: string) => sock.sendMessage(chat, { text }, { quoted: m })

        if (!process.env.NYX_KEY) {
            return reply('✿ Falta configurar la clave NYX_KEY en el servidor')
        }

        const texto = args.join(' ').trim().toLowerCase()
        try {
            await sock.sendMessage(chat, { react: { text: '📖', key: m.key } }).catch(() => null)

            let titulo: string
            let items: { ref: string; texto: string }[]

            if (!texto || texto === 'random' || texto === 'azar') {
                titulo = 'VERSÍCULO AL AZAR'
                items = listar(await pedir('random'))
            } else if (texto === 'hoy' || texto === 'dia' || texto === 'día' || texto === 'diario') {
                titulo = 'VERSÍCULO DEL DÍA'
                items = listar(await pedir('daily'))
            } else {
                titulo = 'BIBLIA'
                items = listar(await pedir('verse', { ref: args.join(' ').trim() }))
            }

            await reply(await formatear(titulo, items))
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null)
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null)
            return reply(
                `✿ No encontré ese versículo\n` +
                `> Ejemplo: *.biblia Juan 3:16* o *.biblia Salmos 23*`
            )
        }
    }
}
