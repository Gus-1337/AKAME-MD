import axios from 'axios'
import yts from 'yt-search'

const getVideoId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/)
    return match? match[1] : null
}

export default {
    command: ['ytmp3', 'ytaudio', 'ytmp3dl'],
    description: 'Descarga audio de YouTube',
    category: 'download',
    run: async ({ chat, m, sock, args }) => {
        let query = args.join(' ') || m.text.split(' ').slice(1).join(' ')
        if (!query) return sock.sendMessage(chat, { text: '❌ Bro manda el link o nombre\n\nEjemplo: *ytmp3 https://youtu.be/p0DlTQ-bBMM* o *ytmp3 ozuna odisea*' }, { quoted: m })

        try {
            await sock.sendMessage(chat, { text: '⏳ *Buscando...*' }, { quoted: m })

            let url = query
            let videoId = getVideoId(query)

            // Si no es link, buscamos
            if (!videoId) {
                const search = await yts(query)
                if (!search.videos.length) {
                    return sock.sendMessage(chat, { text: '❌ No encontré nada con ese nombre bro' }, { quoted: m })
                }
                const video = search.videos[0]
                url = video.url
                videoId = video.videoId
            }

            await sock.sendMessage(chat, { text: '⏳ *Descargando...*' }, { quoted: m })

            let api = `https://api.delirius.online/download/ytmp3?url=${encodeURIComponent(url)}`
            let { data } = await axios.get(api, { timeout: 20000 })

            if (!data?.status ||!data?.data?.download) {
                return sock.sendMessage(chat, { text: '❌ No se pudo descargar bro' }, { quoted: m })
            }

            let res = data.data

            let extraInfo: any = {}
            try {
                if (videoId) {
                    const info = await yts({ videoId })
                    extraInfo = info || {}
                    if (!extraInfo.title) {
                        const s2 = await yts(`https://youtu.be/${videoId}`)
                        extraInfo = s2?.videos?.[0] || {}
                    }
                }
            } catch {}

            const title = res.title && res.title!== '-'? res.title : extraInfo.title || 'Desconocido'
            const channel = res.author && res.author!== '-'? res.author : extraInfo.author?.name || extraInfo.author || res.channel || 'Desconocido'
            const duration = extraInfo.timestamp || extraInfo.duration?.timestamp || '-'
            const views = extraInfo.views? Number(extraInfo.views).toLocaleString() : res.views? res.views.toLocaleString() : '-'
            const ago = extraInfo.ago || '-'
            const thumb = videoId? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : res.image

            const caption = `➩ Descargando › *${title}*\n\n> ❖ Canal › *${channel}*\n> ⴵ Duración › *${duration}*\n> ❀ Vistas › *${views}*\n> ✩ Publicado › *${ago}*\n> ❒ Enlace › *https://youtube.com/watch?v=${videoId}*`.trim()

            await sock.sendMessage(chat, {
                image: { url: thumb },
                caption: caption
            }, { quoted: m })

            await sock.sendMessage(chat, {
                audio: { url: res.download },
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`
            }, { quoted: m })

        } catch (e: any) {
            console.log('[YTMP3 ERROR]', e?.message)
            return sock.sendMessage(chat, { text: `❌ Error bro: ${e?.message}` }, { quoted: m })
        }
    }
      }
