import yts from 'yt-search';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import config from '#config';

const tmpDir = path.resolve(process.cwd(), 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const extractDownloadUrl = (data) => {
    const candidate = data?.data?.download || data?.download || data?.dl || data?.data?.dl_url || 
                      data?.data?.download?.url || data?.result?.download || 
                      data?.result?.url || data?.result?.link || data?.url || data?.link;
    return (typeof candidate === 'string' && candidate.startsWith('http')) ? candidate : '';
};

const fetchApiUrl = (apiUrl) => {
    return axios.get(apiUrl, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } }).then(res => {
        const dlUrl = extractDownloadUrl(res.data);
        if (!dlUrl) throw new Error('Sin URL');
        return dlUrl;
    });
};

const getAudioUrl = (videoUrl) => {
    const encoded = encodeURIComponent(videoUrl);
    return fetchApiUrl(`https://api.delirius.online/download/ytmp3?url=${encoded}`)
        .catch(() => fetchApiUrl(`https://api.starlights.uk/api/download/ytmp3?url=${encoded}`))
        .catch(() => fetchApiUrl(`https://api.starlights.uk/api/download/ytmp3v2?url=${encoded}`));
};

const downloadToTmp = async (url, ext) => {
    const tmpPath = path.join(tmpDir, `yt-${Date.now()}.${ext}`)
    const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 })
    fs.writeFileSync(tmpPath, data)
    return tmpPath
}

export default {
    command: ['playaudio'],
    description: 'Descarga audio directo sin botones',
    category: 'download',
    group: true,
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const query = args.join(" ").trim();
        let tmpFile = null
        
        if (!query) return sock.sendMessage(chat, { text: `🎧 *Ingresa nombre o link*\nEj: .playaudio Bad Bunny` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: "🎧", key: msg.key } });
            
            let videoUrl = query;
            let title = 'audio';

            const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);
            if (!urlMatch) {
                const search = await yts(query);
                if (!search?.videos?.length) throw new Error('No results');
                const video = search.videos[0];
                videoUrl = `https://youtu.be/${video.videoId}`;
                title = video.title;
            }

            const dlUrl = await getAudioUrl(videoUrl);
            tmpFile = await downloadToTmp(dlUrl, 'mp3');

            await sock.sendMessage(chat, { 
                audio: fs.readFileSync(tmpFile), 
                mimetype: "audio/mpeg",
                fileName: `${title}.mp3`
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            await sock.sendMessage(chat, { react: { text: "❌", key: msg.key } });
            return sock.sendMessage(chat, { text: `❌ No se pudo descargar` }, { quoted: msg });
        } finally {
            if (tmpFile && fs.existsSync(tmpFile)) try { fs.unlinkSync(tmpFile) } catch {}
        }
    }
};
