import { generateWAMessageFromContent, generateWAMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import axios from 'axios';
import crypto from 'crypto';

export default {
    command: ['ttsearch', 'tiktoksearch', 'tts'],
    category: 'download',
    description: 'busca videos en tiktok',
    run: async (ctx) => {
        const { sock, msg, chat, args, jid } = ctx;
        const targetJid = jid || chat;
        const query = args.join(' ').trim();
        if (!query) return sock.sendMessage(chat, { text: `✿ Ingresa búsqueda ej: .tts goku` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: "🔍", key: msg.key } });

            const { data } = await axios.get(`https://api-faa.my.id/faa/tiktok-search?q=${encodeURIComponent(query)}`, { timeout: 20000 });
            const lista = data.resultado || data.result || [];
            if (!lista.length) throw new Error("sin resultados");

            const top10 = lista.slice(0, 10); // 10 VIDEOS
            let buffers = [];

            for (let v of top10) {
                const videoUrl = v.url_nowm || v.url_wm || v.play;
                if (!videoUrl) continue;
                try {
                    const res = await axios.get(videoUrl, {
                        responseType: 'arraybuffer',
                        timeout: 25000,
                        headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.tiktok.com/' }
                    });
                    buffers.push({
                        buffer: Buffer.from(res.data),
                        titulo: v.título || v.title || 'tiktok'
                    });
                    if (buffers.length === 10) break;
                } catch { continue; }
            }

            if (!buffers.length) throw new Error("No se pudo descargar ningún video");

            // 1. Abrir álbum
            const opener = generateWAMessageFromContent(targetJid, {
                messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                albumMessage: { expectedImageCount: 0, expectedVideoCount: buffers.length }
            }, { userJid: jidNormalizedUser(sock.user.id), quoted: msg, upload: sock.waUploadToServer });

            await sock.relayMessage(targetJid, opener.message, { messageId: opener.key.id });

            // 2. Enviar cada video como hijo
            for (let i = 0; i < buffers.length; i++) {
                const b = buffers[i];
                const child = await generateWAMessage(targetJid, {
                    video: b.buffer,
                    mimetype: 'video/mp4',
                    caption: i === 0 ? `✿ TT Search - ${query}\n📹 ${buffers.length} videos\n\n> AKAME-MD` : ''
                }, { upload: sock.waUploadToServer });

                child.message.messageContextInfo = {
                    messageSecret: crypto.randomBytes(32),
                    messageAssociation: { associationType: 1, parentMessageKey: opener.key }
                };

                await sock.relayMessage(targetJid, child.message, { messageId: child.key.id });
            }

            await sock.sendMessage(chat, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.log('[TT ALBUM ERROR]', e.message);
            await sock.sendMessage(chat, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(chat, { text: `❌ Error: ${e.message}` }, { quoted: msg });
        }
    }
};
