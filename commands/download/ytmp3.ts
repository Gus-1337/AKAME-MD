import axios from 'axios'

export default {
    command: ['ytmp3', 'ytaudio', 'ytmp3dl'],
    description: 'Descarga audio de YouTube',
    category: 'download',
    run: async ({ chat, m, sock, args }) => {
        let url = args[0] || m.text.split(' ')[1]
        if (!url) return sock.sendMessage(chat, { text: '❌ Bro manda el link\n\nEjemplo: *ytmp3 https://youtu.be/p0DlTQ-bBMM*' }, { quoted: m })

        if (!url.includes('youtube.com') &&!url.includes('youtu.be')) {
            return sock.sendMessage(chat, { text: '❌ Ese no es un link de YouTube' }, { quoted: m })
        }

        try {
            await sock.sendMessage(chat, { text: '⏳ *Descargando audio...*' }, { quoted: m })

            let api = `https://nyxdlapi.vercel.app/api/downloads/youtube?apikey=nyx_aOtu2zWUS5jfVwzbtmiDBZAfPZ_xeMTX&url=${encodeURIComponent(url)}`

            let { data } = await axios.get(api)

            if (!data.status ||!data.result?.download_url) {
                return sock.sendMessage(chat, { text: '❌ No se pudo descargar bro, intenta con otro link' }, { quoted: m })
            }

            let res = data.result

            await sock.sendMessage(chat, {
                image: { url: res.thumbnail },
                caption: `*YTMP3 - AKAME MD*\n\n🎵 *Título:* ${res.title}\n⏱️ *Duración:* ${res.duration}s\n\n_Enviando audio..._`
            }, { quoted: m })

            await sock.sendMessage(chat, {
                audio: { url: res.download_url },
                mimetype: 'audio/mpeg',
                fileName: `${res.title}.mp3`
            }, { quoted: m })

        } catch (e) {
            console.log(e)
            return sock.sendMessage(chat, { text: '❌ Error en la API bro, intenta más tarde' }, { quoted: m })
        }
    }
    }
