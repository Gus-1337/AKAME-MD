import { generateWAMessageFromContent, generateWAMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import fetch from 'node-fetch';
import crypto from 'crypto';

export default {
    command: ['pinterest', 'pin'],
    category: 'search',
    description: 'Busca y descarga imágenes de Pinterest',
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix, jid } = ctx;
        const targetJid = jid || chat;
        const q = args.join(' ').trim();
        if (!q) return sock.sendMessage(chat, { text: `📌 *Pinterest Search*\n\nUsa: ${usedPrefix}pin <texto>\nEj: ${usedPrefix}pin animes` }, { quoted: msg });

        try {
            const apikey = 'nyx_2rmMAKqdXlIkD9YLhMf29fU25Jo8rK1C';
            const res = await fetch(`https://nyxdlapi.vercel.app/api/search/pinterest?apikey=${apikey}&q=${encodeURIComponent(q)}`).then(r => r.json());

            if (!res?.result?.results?.length) {
                return sock.sendMessage(chat, { text: `❌ No se encontraron resultados para: ${q}` }, { quoted: msg });
            }

            const images = res.result.results.slice(0, 10).map(v => v.download || v.image || v.descarga);

            // 1. Abrir álbum
            const opener = generateWAMessageFromContent(targetJid, {
                messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                albumMessage: { expectedImageCount: images.length, expectedVideoCount: 0 }
            }, { userJid: jidNormalizedUser(sock.user.id), quoted: msg, upload: sock.waUploadToServer });

            await sock.relayMessage(targetJid, opener.message, { messageId: opener.key.id });

            // 2. Enviar cada imagen como hija del álbum
            for (let i = 0; i < images.length; i++) {
                const url = images[i];
                const child = await generateWAMessage(targetJid, {
                    image: { url },
                    caption: i === 0? `📌 *Pinterest - Descarga*\n🔎 Búsqueda: ${res.result.query}\n📸 Resultados: ${images.length} fotos\n\n> Busca imágenes en Pinterest` : ''
                }, { upload: sock.waUploadToServer });

                child.message.messageContextInfo = {
                    messageSecret: crypto.randomBytes(32),
                    messageAssociation: { associationType: 1, parentMessageKey: opener.key }
                };

                await sock.relayMessage(targetJid, child.message, { messageId: child.key.id });
            }

        } catch (e) {
            console.log(e);
            await sock.sendMessage(chat, { text: `Error: ${e.message}` }, { quoted: msg });
        }
    }
};
