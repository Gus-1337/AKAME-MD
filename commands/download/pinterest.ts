import { generateWAMessageFromContent, generateWAMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import fetch from 'node-fetch';
import crypto from 'crypto';

export default {
    command: ['pinterest', 'pin'],
    category: 'download',
    description: 'descarga imagenes de pinterest',
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix, jid } = ctx;
        const targetJid = jid || chat;
        const q = args.join(' ').trim();
        if (!q) return sock.sendMessage(chat, { 
            text: `☬ *AKAME - PINTEREST* ☬\n\n♡ *Usa:*\n> ${usedPrefix}pin <texto>\n\n♡ *Ejemplo:*\n> ${usedPrefix}pin mikasa\n> ${usedPrefix}pin gatos` 
        }, { quoted: msg });

        try {
            const res = await fetch(`https://api-faa.my.id/faa/pinterest?q=${encodeURIComponent(q)}`).then(r => r.json());
            const results = res.resultado || res.result || [];
            if (!results.length) {
                return sock.sendMessage(chat, { text: `☬ *AKAME-MD* ☬\n\n♡ No se encontraron resultados para: *${q}*` }, { quoted: msg });
            }

            const images = results.slice(0, 15);

            const opener = generateWAMessageFromContent(targetJid, {
                messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                albumMessage: { expectedImageCount: images.length, expectedVideoCount: 0 }
            }, { userJid: jidNormalizedUser(sock.user.id), quoted: msg, upload: sock.waUploadToServer });

            await sock.relayMessage(targetJid, opener.message, { messageId: opener.key.id });

            const sendPromises = images.map(async (url, i) => {
                const caption = i === 0 ? 
`☬ *PINTEREST* ☬

♡ *Búsqueda:* ${q}
♡ *Resultados:* ${images.length} fotos

☬ *AKAME-MD* ♡` : '';

                const child = await generateWAMessage(targetJid, {
                    image: { url },
                    caption
                }, { upload: sock.waUploadToServer });

                child.message.messageContextInfo = {
                    messageSecret: crypto.randomBytes(32),
                    messageAssociation: { associationType: 1, parentMessageKey: opener.key }
                };

                await sock.relayMessage(targetJid, child.message, { messageId: child.key.id });
            });

            await Promise.all(sendPromises);

        } catch (e) {
            console.log(e);
            await sock.sendMessage(chat, { text: `☬ *AKAME-MD* ☬\n\n♡ Error: ${e.message}` }, { quoted: msg });
        }
    }
};
