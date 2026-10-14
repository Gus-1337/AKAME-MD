import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import yts from 'yt-search';
import config from '#config';
import { getAudioBuffer, getVideoBuffer } from '#ytdl';

const formatViews = (v) =>
    v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' :
    v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' :
    v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v);

const emitProgress = (msgId, step, extraData = {}) => {
    queueMicrotask(() => {
        global.broadcast?.('cmd_progress', { id: msgId, step, ...extraData });
    });
};

const limpiarNombre = (t) => (t || 'video').replace(/[\\\\/:*?\"<>|]/g, '').trim().slice(0, 80) || 'video';

const YT_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/;

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

        if (!query) return sock.sendMessage(chat, { text: `ꕤ *Ingresa el título o enlace*\nEjemplo: ${p}play3 Bad Bunny` }, { quoted: msg });

        // ---- Descarga directa (lo dispara el botón o un enlace) ----
        // Formato: "<enlace> mp3" | "<enlace> mp4" | "<enlace>" (por defecto mp3)
        const urlMatch = query.match(YT_REGEX);

        if (urlMatch) {
            const formato = /\bmp4\b/i.test(query) ? 'mp4' : 'mp3';
            const videoId = urlMatch[1];
            const videoUrl = `https://youtu.be/${videoId}`;
            try {
                await sock.sendMessage(chat, { react: { text: formato === 'mp4' ? '🎬' : '🎧', key: msg.key } });

                // Título real para el nombre del archivo (si falla, queda "video")
                let titulo = 'video';
                try {
                    const info = await yts({ videoId });
                    titulo = limpiarNombre(info?.title);
                } catch {}

                if (formato === 'mp4') {
                    emitProgress(msgId, 'fetching_video_stream');
                    const buffer = await getVideoBuffer(videoUrl);
                    emitProgress(msgId, 'sending_video_to_whatsapp');
                    await sock.sendMessage(chat, {
                        document: buffer,
                        mimetype: 'video/mp4',
                        fileName: `${titulo}.mp4`,
                        caption: `🎬 ${titulo}`
                    }, { quoted: msg });
                } else {
                    emitProgress(msgId, 'fetching_audio_stream');
                    const buffer = await getAudioBuffer(videoUrl);
                    emitProgress(msgId, 'sending_audio_to_whatsapp');
                    await sock.sendMessage(chat, {
                        document: buffer,
                        mimetype: 'audio/mpeg',
                        fileName: `${titulo}.mp3`,
                        caption: `🎧 ${titulo}`
                    }, { quoted: msg });
                }
                await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });
                return;
            } catch (e) {
                console.log('[PLAY3 ERROR]', e?.message);
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
                return sock.sendMessage(chat, { text: `❌ No se pudo descargar el ${formato === 'mp4' ? 'video' : 'audio'}, intenta de nuevo` }, { quoted: msg });
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
