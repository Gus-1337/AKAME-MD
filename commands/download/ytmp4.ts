import axios from 'axios';
import fs from 'fs';
import path from 'path';
import config from '#config';

const tmpDir = path.resolve(process.cwd(), 'tmp')
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

const extractDownloadUrl = (data) => {
    const c = data?.data?.download || data?.download || data?.result?.url || data?.url || data?.link;
    return (typeof c === 'string' && c.startsWith('http')) ? c : (typeof c?.url === 'string' ? c.url : '');
};
const fetchApiUrl = (apiUrl) => axios.get(apiUrl, { timeout: 30000 }).then(res => {
    const dl = extractDownloadUrl(res.data); if(!dl) throw new Error('Sin URL'); return dl;
});
const getVideoUrl = (videoUrl) => {
    const e = encodeURIComponent(videoUrl);
    return fetchApiUrl(`https://api.delirius.online/download/ytmp4?url=${e}`).catch(()=>fetchApiUrl(`https://api.starlights.uk/api/download/ytmp4?url=${e}`))
};
const downloadToTmp = async (url, ext) => {
    const tmpPath = path.join(tmpDir, `yt-${Date.now()}.${ext}`)
    const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 })
    fs.writeFileSync(tmpPath, data); return tmpPath
}

export default {
    command: ['ytmp4', 'video', 'ytv'],
    description: 'Descarga video de YouTube',
    category: 'download',
    group: true,
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const p = ctx.usedPrefix || ctx.prefix || config.prefix || ".";
        const query = args.join(" ").trim();
        if (!query) return sock.sendMessage(chat, { text: `Usa: ${p}ytmp4 <link>` }, { quoted: msg });
        let tmpFile = null
        try {
            await sock.sendMessage(chat, { react: { text: "🎬", key: msg.key } });
            const dlUrl = await getVideoUrl(query);
            tmpFile = await downloadToTmp(dlUrl, 'mp4')
            await sock.sendMessage(chat, { video: fs.readFileSync(tmpFile), mimetype: 'video/mp4', caption: `🎬 Listo` }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: "✅", key: msg.key } });
        } catch {
            await sock.sendMessage(chat, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(chat, { text: '❌ Error al descargar video' }, { quoted: msg });
        } finally {
            if (tmpFile && fs.existsSync(tmpFile)) try { fs.unlinkSync(tmpFile) } catch {}
        }
    }
}