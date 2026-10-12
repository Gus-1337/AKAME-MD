import { generateWAMessageFromContent, generateWAMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import fetch from 'node-fetch';
import crypto from 'crypto';

async function getBuffer(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.google.com/' },
      timeout: 10000
    });
    if (!res.ok) return null;
    const buff = await res.buffer();
    if (buff.length < 8000) return null;
    return buff;
  } catch { return null; }
}

export default {
    command: ['imagen', 'image', 'gimage', 'img'],
    category: 'download',
    description: 'Google Image 10 en álbum',
    run: async (ctx) => {
        const { sock, msg, chat, args, jid } = ctx;
        const targetJid = jid || chat;
        const q = args.join(' ').trim();
        if (!q) return sock.sendMessage(chat, { text: `🌸 Usa: .imagen <texto>` }, { quoted: msg });

        try {
            const res = await fetch(`https://api-faa.my.id/faa/google-image?query=${encodeURIComponent(q)}`).then(r => r.json());
            let results = (res.resultado || res.result || []).filter(u =>!u.includes('nocookie.net'));
            
            const validImages = [];
            for (const url of results) {
                if (validImages.length >= 10) break;
                const buff = await getBuffer(url);
                if (buff) validImages.push(buff);
            }

            if (!validImages.length) throw new Error('Sin imágenes válidas');

            const opener = generateWAMessageFromContent(targetJid, {
                messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                albumMessage: { expectedImageCount: validImages.length, expectedVideoCount: 0 }
            }, { userJid: jidNormalizedUser(sock.user.id), quoted: msg, upload: sock.waUploadToServer });

            await sock.relayMessage(targetJid, opener.message, { messageId: opener.key.id });

            for (let i = 0; i < validImages.length; i++) {
                const caption = i === 0 ? `🌸 *GOOGLE IMAGE* 🌸\n│ Query: ${q}\n│ Total: ${validImages.length} imgs\n*AKAME-MD* 🌸` : '';
                const child = await generateWAMessage(targetJid, { image: validImages[i], caption }, { upload: sock.waUploadToServer });
                child.message.messageContextInfo = {
                    messageSecret: crypto.randomBytes(32),
                    messageAssociation: { associationType: 1, parentMessageKey: opener.key }
                };
                await sock.relayMessage(targetJid, child.message, { messageId: child.key.id });
            }
        } catch (e) {
            console.log(e);
            await sock.sendMessage(chat, { text: `🌸 Error: ${e.message}` }, { quoted: msg });
        }
    }
};
