import axios from 'axios'
import yts from 'yt-search'
import { stellarUrl } from '../../lib/stellar.ts'

const MAX_BYTES = 400 * 1024 * 1024 // 400 MB (canciones largas)
const MIN_BYTES = 20 * 1024        // menos de 20 KB = respuesta basura
const YOSOYYO_URL = 'https://api-yosoyyo-api-ofc.onrender.com'
const YOSOYYO_KEY = process.env.YOSOYYO_KEY || 'Akame-proyet'

const YT_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/|live\/))([a-zA-Z0-9_-]{11})/

const getVideoId = (url: string) => {
    const m = url.match(YT_REGEX)
    return m ? m[1] : null
}

/** Saca el enlace de descarga de la respuesta de cualquier API. */
const extraerLink = (d: any): string => {
    const candidatos = [
        d?.data?.download, d?.data?.dl, d?.download, d?.result?.download_url, d?.result?.download,
        d?.result?.url, d?.data?.dl_url, d?.data?.url, d?.data?.download?.url,
        d?.resultado?.download_url, d?.url, d?.link
    ]
    for (const c of candidatos) {
        if (typeof c === 'string' && c.startsWith('http')) return c
        if (typeof c?.url === 'string' && c.url.startsWith('http')) return c.url
    }
    return ''
}

/** Valida que los bytes sean audio real (MP3, M4A/AAC u Ogg), no HTML/JSON. */
const esAudio = (buf: Buffer): boolean => {
    if (buf.length < MIN_BYTES) return false
    const head = buf.subarray(0, 32)
    const txt = head.toString('utf8', 0, 16).trimStart()
    if (txt.startsWith('<') || txt.startsWith('{')) return false
    if (head.subarray(0, 3).toString() === 'ID3') return true                  // MP3 con etiqueta
    if (head[0] === 0xff && (head[1] & 0xe0) === 0xe0) return true             // MP3 frame sync
    if (head.indexOf('ftyp') !== -1) return true                               // M4A/MP4
    if (head.subarray(0, 4).toString() === 'OggS') return true                 // Ogg
    return false
}

const descargar = async (url: string): Promise<Buffer> => {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 60000,
        maxContentLength: MAX_BYTES,
        maxBodyLength: MAX_BYTES,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const buf = Buffer.from(res.data)
    if (!esAudio(buf)) throw new Error('no es audio')
    return buf
}

/** Pide el enlace a una API y descarga el audio. */
const intentar = async (api: string): Promise<Buffer> => {
    const { data } = await axios.get(api, { timeout: 20000, headers: { 'User-Agent': 'Mozilla/5.0' } })
    const link = extraerLink(data)
    if (!link) throw new Error('sin enlace')
    return descargar(link)
}

/** yosoyyo: prueba cada candidato de audio hasta que uno sea válido. */
const intentarYosoyyo = async (videoUrl: string): Promise<Buffer> => {
    const api = `${YOSOYYO_URL}/api/youtube/v2?url=${encodeURIComponent(videoUrl)}&format=mp3&apiKey=${encodeURIComponent(YOSOYYO_KEY)}`
    const { data } = await axios.get(api, { timeout: 45000, headers: { 'User-Agent': 'Mozilla/5.0' } })
    const links = (data?.result?.results || [])
        .filter((r: any) => r?.type === 'audio' && typeof r?.download === 'string' && r.download.startsWith('http'))
        .map((r: any) => r.download)
        .slice(0, 3)
    let ultimo: any = new Error('sin enlaces')
    for (const l of links) {
        try { return await descargar(l) } catch (e) { ultimo = e }
    }
    throw ultimo
}

/** Dorratz: pide el enlace y descarga el archivo por su proxy (más estable que el enlace directo). */
const intentarDorratz = async (videoUrl: string, type: 'audio' | 'video', quality: number): Promise<Buffer> => {
    const api = `https://api.dorratz.com/v1/youtube?url=${encodeURIComponent(videoUrl)}&type=${type}&quality=${quality}`;
    const { data } = await axios.get(api, { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!data?.ok || !data?.data) throw new Error('dorratz sin resultado');
    const candidatos = [
        data.data.proxy ? `https://api.dorratz.com${data.data.proxy}` : '',
        typeof data.data.download === 'string' ? data.data.download : ''
    ].filter((l) => l.startsWith('http'));
    let ultimo: any = new Error('dorratz sin enlaces');
    for (const l of candidatos) {
        try { return await descargar(l); } catch (e) { ultimo = e; }
    }
    throw ultimo;
};

/** Todas las fuentes en paralelo: gana la primera que entregue audio válido. Dos rondas. */
const getAudio = async (videoUrl: string): Promise<Buffer> => {
    const e = encodeURIComponent(videoUrl)
    const apis = [
        `https://api.delirius.online/download/ytmp3?url=${e}`,
        `https://api-gohan-v1.onrender.com/download/ytaudio?url=${e}&download=true`,
        `https://api.ryuzei.xyz/download/ytmp3/v4?url=${e}&quality=64`,
        `https://api.starlights.uk/api/download/ytmp3?url=${e}`,
        `https://api.starlights.uk/api/download/ytmp3v2?url=${e}`,
        `https://api-gohan-v1.onrender.com/download/ytaudio?url=${e}`,
        stellarUrl('/dl/ytmp3', { url: videoUrl })
    ]
    let ultimo: any = null
    for (let ronda = 1; ronda <= 2; ronda++) {
        const tareas = [...apis.map((api) => intentar(api)), intentarYosoyyo(videoUrl), intentarDorratz(videoUrl, 'audio', 128)]
        try {
            return await Promise.any(tareas)
        } catch (err) { ultimo = err }
    }
    const primerError = ultimo?.errors?.[0]?.message
    throw new Error(`todas las APIs fallaron${primerError ? ': ' + primerError : ''}`)
}

const limpiarNombre = (t: string) => (t || 'audio').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'audio'

const formatViews = (v: any) => {
    const n = Number(v)
    if (!n) return '-'
    return n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : String(n)
}

export default {
    command: ['ytmp3', 'ytaudio', 'ytmp3dl'],
    description: 'Descarga audio de YouTube (link o nombre)',
    category: 'download',
    run: async ({ chat, m, sock, args }) => {
        const query = (args.join(' ') || m.text?.split(' ').slice(1).join(' ') || '').trim()
        if (!query) return sock.sendMessage(chat, { text: '❌ Bro manda el link o nombre\n\nEjemplo: *ytmp3 https://youtu.be/p0DlTQ-bBMM* o *ytmp3 ozuna odisea*' }, { quoted: m })

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } })

            // Enlace o búsqueda
            let videoId = getVideoId(query)
            let info: any = null
            if (!videoId) {
                const search = await yts(query)
                info = search.videos?.[0]
                if (!info) {
                    await sock.sendMessage(chat, { react: { text: '❌', key: m.key } })
                    return sock.sendMessage(chat, { text: '❌ No encontré nada con ese nombre bro' }, { quoted: m })
                }
                videoId = info.videoId
            }
            const videoUrl = `https://youtu.be/${videoId}`

            // Info del video y descarga al mismo tiempo
            const infoPromise = info ? Promise.resolve(info) : yts({ videoId }).catch(() => null)
            const audioPromise = getAudio(videoUrl)

            const [audio, extra] = await Promise.all([audioPromise, infoPromise])
            const title = limpiarNombre(extra?.title || 'Desconocido')
            const channel = extra?.author?.name || 'Desconocido'
            const duration = extra?.timestamp || '-'
            const views = formatViews(extra?.views)
            const ago = extra?.ago || '-'
            const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

            const caption = `➩ Descargando › *${title}*\n\n> ❖ Canal › *${channel}*\n> ⴵ Duración › *${duration}*\n> ❀ Vistas › *${views}*\n> ✩ Publicado › *${ago}*\n> ❒ Enlace › *https://youtube.com/watch?v=${videoId}*`

            // Tarjeta con miniatura y luego el audio como archivo
            await sock.sendMessage(chat, { image: { url: thumb }, caption }, { quoted: m }).catch(() => null)
            await sock.sendMessage(chat, {
                audio,
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`
            }, { quoted: m })

            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } })

        } catch (e: any) {
            console.log('[YTMP3 ERROR]', e?.message)
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } })
            return sock.sendMessage(chat, { text: `❌ Error bro, intenta de nuevo` }, { quoted: m })
        }
    }
}
