import fetch from 'node-fetch';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

async function getBuffer(imageMessage) {
  const stream = await downloadContentFromMessage(imageMessage, 'image');
  let buffer = Buffer.from([]);
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }
  return buffer;
}

// Subida con 3 intentos
async function uploadImage(buffer) {
  // 1 - Catbox (el más estable)
  try {
    const form = new FormData();
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', blob, 'akame.jpg');
    const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form });
    const url = await res.text();
    if (url.includes('https://')) return url.trim();
  } catch {}

  // 2 - 0x0.st
  try {
    const form = new FormData();
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    form.append('file', blob, 'akame.jpg');
    const res = await fetch('https://0x0.st', { method: 'POST', body: form });
    const url = await res.text();
    if (url.includes('https://')) return url.trim();
  } catch {}

  // 3 - Qu.ax
  try {
    const form = new FormData();
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    form.append('file', blob, 'akame.jpg');
    const res = await fetch('https://qu.ax/upload.php', { method: 'POST', body: form });
    const json = await res.json();
    if (json.url) return json.url;
  } catch {}

  throw new Error('Todos los servidores fallaron, intenta de nuevo');
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
                await sock.sendMessage(chat, { text: `☬ *AKAME-MD* ☬\n\n♡ Subiendo imagen...` }, { quoted: msg });
                const buffer = await getBuffer(imageMessage);
                imageUrl = await uploadImage(buffer);
            }

            if (!imageUrl) {
                return sock.sendMessage(chat, {
                    text: `☬ *MEJORAR HD* ☬\n\n♡ Responde a una imagen con:\n> ${usedPrefix}hd\n\n☬ *AKAME-MD* ♡`
                }, { quoted: msg });
            }

            await sock.sendMessage(chat, { text: `☬ *AKAME-MD* ☬\n\n♡ Mejorando a HD... espera pa` }, { quoted: msg });

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
