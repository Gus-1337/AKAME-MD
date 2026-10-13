import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import yts from 'yt-search';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import config from '#config';

const tmpDir = path.resolve(process.cwd(), 'tmp');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const formatViews = (v) =>
    v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' :
    v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' :
    v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v);

const emitProgress = (msgId, step, extraData = {}) => {
    queueMicrotask(() => {
        global.broadcast?.('cmd_progress', { id: msgId, step, ...extraData });
    });
};

const extractDownloadUrl = (data) => {
    const candidate = data?.data?.download || data?.download || data?.dl || data?.data?.dl_url ||
        data?.data?.download?.url || data?.datos?.url || data?.result?.download ||
        data?.result?.dl || data?.result?.url || data?.result?.link ||
        data?.data?.dl || data?.data?.url || data?.data?.link ||
        (typeof data?.download === 'object' ? data?.download?.url || data?.download?.link : null) ||
        data?.url || data?.link;
    return (typeof candidate === 'string' && candidate.startsWith('http')) ? candidate : '';
};

const fetchApiUrl = (apiUrl) =>
    axios.get(apiUrl, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }).then(res => {
        const dlUrl = extractDownloadUrl(res.data);
        if (!dlUrl) throw new Error('Sin URL');
        return dlUrl;
    });

// Audio: Delirius primero, luego respaldos
const getAudioUrl = (videoUrl) => {
    const enc = encodeURIComponent(videoUrl);
    const apis = [
        `https://api.delirius.online/download/ytmp3?url=${enc}`,
        `https://api.starlights.uk/api/download/ytmp3?url=${enc}`,
        `https://api.starlights.uk/api/download/ytmp3v2?url=${enc}`,
        `https://api.ryuzei.xyz/download/ytmp3/v4?url=${enc}&quality=64`
    ];
    let p = fetchApiUrl(apis[0]);
    for (let i = 1; i < apis.length; i++) p = p.catch(() => fetchApiUrl(apis[i]));
    return p;
};

// Video: Delirius primero, luego respaldo (algunos videos dan 451 en Delirius)
const getVideoUrl = (videoUrl) => {
    const enc = encodeURIComponent(videoUrl);
    const apis = [
        `https://api.delirius.online/download/ytmp4?url=${enc}`,
        `https://api.starlights.uk/api/download/ytmp4?url=${enc}`
    ];
    return fetchApiUrl(apis[0]).catch(() => fetchApiUrl(apis[1]));
};

const downloadToTmp = async (url, ext) => {
    const tmpPath = path.join(tmpDir, `yt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`);
    const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 120000 });
    fs.writeFileSync(tmpPath, data);
    return tmpPath;
};

const limpiarNombre = (t) => (t || 'video').replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'video';

export default {
    command: ['play3'],
    description: 'Busca un video y lo descarga como MP3 o MP4 en documento',
    category: 'download',
    group: true,
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const p = ctx.usedPrefix || ctx.prefix || config.prefix || '.';
        const msgId = msg?.id || msg?.key?.id;
        const query = args.join(' ').trim();
        let tmpFile = null;

        if (!query) return sock.sendMessage(chat, { text: `ꕤ *Ingresa el título o enlace*\nEjemplo: ${p}play3 Bad Bunny` }, { quoted: msg });

        // ---- Descarga directa (lo dispara el botón o un enlace) ----
        // Formato: "<enlace> mp3" | "<enlace> mp4" | "<enlace>" (por defecto mp3)
        const urlMatch = query.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/);

        if (urlMatch) {
            const formato = /\bmp4\b/i.test(query) ? 'mp4' : 'mp3';
            const videoUrl = `https://youtu.be/${urlMatch[1]}`;
            try {
                await sock.sendMessage(chat, { react: { text: formato === 'mp4' ? '🎬' : '🎧', key: msg.key } });

                // Título real para el nombre del archivo (si falla, queda "video")
                let titulo = 'video';
                try {
                    const info = await yts({ videoId: urlMatch[1] });
                    titulo = limpiarNombre(info?.title);
                } catch {}

                if (formato === 'mp4') {
                    emitProgress(msgId, 'fetching_video_stream');
                    const dlUrl = await getVideoUrl(videoUrl);
                    emitProgress(msgId, 'sending_video_to_whatsapp');
                    tmpFile = await downloadToTmp(dlUrl, 'mp4');
                    await sock.sendMessage(chat, {
                        document: fs.readFileSync(tmpFile),
                        mimetype: 'video/mp4',
                        fileName: `${titulo}.mp4`,
                        caption: `🎬 ${titulo}`
                    }, { quoted: msg });
                } else {
                    emitProgress(msgId, 'fetching_audio_stream');
                    const dlUrl = await getAudioUrl(videoUrl);
                    emitProgress(msgId, 'sending_audio_to_whatsapp');
                    tmpFile = await downloadToTmp(dlUrl, 'mp3');
                    await sock.sendMessage(chat, {
                        document: fs.readFileSync(tmpFile),
                        mimetype: 'audio/mpeg',
                        fileName: `${titulo}.mp3`,
                        caption: `🎧 ${titulo}`
                    }, { quoted: msg });
                }
                await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });
                return;
            } catch {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
                return sock.sendMessage(chat, { text: `❌ No se pudo descargar el ${formato === 'mp4' ? 'video' : 'audio'}` }, { quoted: msg });
            } finally {
                if (tmpFile && fs.existsSync(tmpFile)) try { fs.unlinkSync(tmpFile); } catch {}
            }
        }

        // ---- Búsqueda + botones ----
        try {
            await sock.sendMessage(chat, { react: { text: '🔍', key: msg.key } });
            emitProgress(msgId, 'search_started', { query });
            const searchResult = await yts(query);
            if (!searchResult?.videos?.length) {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
                return sock.sendMessage(chat, { text: `✿ No se encontraron resultados para **${query}**.` }, { quoted: msg });
            }
            const video = searchResult.videos[0];
            const videoId = video.videoId;
            const videoUrl = `https://youtu.be/${videoId}`;
            const title = (video.title || 'Sin título').trim();
            const channel = (video.author?.name || 'Desconocido').trim();
            const views = typeof video.views === 'number' ? video.views : 0;
            const duration = (video.timestamp || 'Desconocido').trim();

            const txt =
`🎵 *${title}*\n\n` +
`✿ *Canal* » ${channel}\n` +
`✿ *Vistas* » ${formatViews(views)}\n` +
`✿ *Duración* » ${duration}\n` +
`✿ *Link* » ${videoUrl}\n\n` +
`_Elige el formato del archivo_`;

            const media = await prepareWAMessageMedia(
                { image: { url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` } },
                { upload: sock.waUploadToServer }
            );

            const botones = [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🎵 MP3 (doc)',
                        id: `${p}play3 ${videoUrl} mp3`
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🎬 MP4 (doc)',
                        id: `${p}play3 ${videoUrl} mp4`
                    })
                }
            ];

            const card = generateWAMessageFromContent(chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: txt },
                            footer: { text: 'AKAME MD • Descarga en documento' },
                            header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
                            nativeFlowMessage: { buttons: botones }
                        }
                    }
                }
            }, { quoted: msg });

            await sock.relayMessage(chat, card.message, { messageId: card.key.id });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.log('[PLAY3 ERROR]', e);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
        }
    }
};
