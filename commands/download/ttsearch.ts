import { generateWAMessageFromContent, generateWAMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import axios from 'axios';
import crypto from 'crypto';

const MAX_VIDEOS = 10;
const LOTE = 10;                 // descargas simultáneas por lote
const MAX_BYTES = 45 * 1024 * 1024; // descarta videos muy pesados

/** Descarga un video; devuelve null si falla o pesa demasiado. */
async function bajarVideo(v: any) {
    const videoUrl = v.url_nowm || v.url_wm || v.play;
    if (!videoUrl) return null;
    try {
        const res = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            maxContentLength: MAX_BYTES,
            maxBodyLength: MAX_BYTES,
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.tiktok.com/' }
        });
        return { buffer: Buffer.from(res.data), titulo: v.título || v.title || 'tiktok' };
    } catch {
        return null;
    }
}

/** Descarga en paralelo hasta juntar MAX_VIDEOS, respetando el orden original. */
async function bajarTodos(candidatos: any[]) {
    const ok: any[] = [];
    for (let i = 0; i < candidatos.length && ok.length < MAX_VIDEOS; i += LOTE) {
        const lote = candidatos.slice(i, i + LOTE);
        const resultados = await Promise.all(lote.map(bajarVideo));
        for (const r of resultados) {
            if (r && ok.length < MAX_VIDEOS) ok.push(r);
        }
    }
    return ok;
}

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
            await sock.sendMessage(chat, { react: { text: '🔍', key: msg.key } });

            const { data } = await axios.get(
                `https://api-faa.my.id/faa/tiktok-search?q=${encodeURIComponent(query)}`,
                { timeout: 15000 }
            );
            const lista = (data.resultado || data.result || []).filter((v: any) => v);
            if (!lista.length) throw new Error('sin resultados');

            // Descarga todos los candidatos en paralelo (en lotes)
            const buffers = await bajarTodos(lista);
            if (!buffers.length) throw new Error('No se pudo descargar ningún video');

            // 1. Abrir álbum
            const opener = generateWAMessageFromContent(targetJid, {
                messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                albumMessage: { expectedImageCount: 0, expectedVideoCount: buffers.length }
            }, { userJid: jidNormalizedUser(sock.user.id), quoted: msg, upload: sock.waUploadToServer });

            await sock.relayMessage(targetJid, opener.message, { messageId: opener.key.id });

            // 2. Preparar (subir) todos los videos en paralelo
            const hijos = await Promise.all(buffers.map((b, i) =>
                generateWAMessage(targetJid, {
                    video: b.buffer,
                    mimetype: 'video/mp4',
                    caption: i === 0 ? `✿ TT Search - ${query}\n📹 ${buffers.length} videos\n\n> AKAME-MD` : ''
                }, { upload: sock.waUploadToServer })
            ));

            // 3. Enviarlos en orden, asociados al álbum
            for (const child of hijos) {
                child.message.messageContextInfo = {
                    messageSecret: crypto.randomBytes(32),
                    messageAssociation: { associationType: 1, parentMessageKey: opener.key }
                };
                await sock.relayMessage(targetJid, child.message, { messageId: child.key.id });
            }

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.log('[TT ALBUM ERROR]', e.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: `❌ Error: ${e.message}` }, { quoted: msg });
        }
    }
};
