import fetch from 'node-fetch';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

async function getBufferFromImageMessage(imageMessage) {
  const stream = await downloadContentFromMessage(imageMessage, 'image');
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
}

async function uploadImage(buffer) {
  const form = new FormData();
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  form.append('file', blob, 'image.jpg');
  const res = await fetch('https://telegra.ph/upload', {
    method: 'POST',
    body: form
  });
  const json = await res.json();
  if (json[0]?.src) return 'https://telegra.ph' + json[0].src;
  throw new Error('No se pudo subir');
}

export default {
    command: ['hd', 'superhd', 'mejorar', 'remini'],
    category: 'tools',
    description: 'Mejora imagen a HD',
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMessage = msg.message?.imageMessage || quoted?.imageMessage;

        try {
            let imageUrl = args[0];

            if (!imageUrl && imageMessage) {
                await sock.sendMessage(chat, { text: `☬ *AKAME-MD* ☬\n\n♡ Mejorando... espera un toque` }, { quoted: msg });

                const buffer = await getBufferFromImageMessage(imageMessage);
                imageUrl = await uploadImage(buffer);
            }

            if (!imageUrl) {
                return sock.sendMessage(chat, {
                    text: `☬ *MEJORAR HD* ☬\n\n♡ Responde a una imagen con:\n> ${usedPrefix}hd\n\n☬ *AKAME-MD* ♡`
                }, { quoted: msg });
            }

            const apiUrl = `https://api-faa.my.id/faa/superhd?url=${encodeURIComponent(imageUrl)}`;

            await sock.sendMessage(chat, {
                image: { url: apiUrl },
                caption: `☬ *HD MEJORADO* ☬\n\n♡ *Calidad:* Super HD 4K\n\n☬ *AKAME-MD* ♡`
            }, { quoted: msg });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(chat, { text: `♡ Error: ${e.message}` }, { quoted: msg });
        }
    }
};
