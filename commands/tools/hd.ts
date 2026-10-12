import fetch from 'node-fetch';

async function uploadImage(buffer) {
  const form = new FormData();
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  form.append('file', blob, 'image.jpg');
  // api free para subir
  const res = await fetch('https://telegra.ph/upload', {
    method: 'POST',
    body: form
  });
  const json = await res.json();
  if (json[0]?.src) return 'https://telegra.ph' + json[0].src;
  throw new Error('No se pudo subir la imagen');
}

export default {
    command: ['hd', 'superhd', 'mejorar', 'enhance', 'remini'],
    category: 'tools',
    description: 'Mejora imagen a HD 4K',
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        const hasImage = msg.message?.imageMessage || quoted?.imageMessage || quoted?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

        try {
            let imageUrl = args[0];

            if (!imageUrl && hasImage) {
                await sock.sendMessage(chat, { text: `☬ *AKAME-MD* ☬\n\n♡ Mejorando... espera un toque` }, { quoted: msg });

                // descargar imagen citada o actual
                let messageToDownload = msg;
                if (quoted?.imageMessage) {
                    messageToDownload = { message: { imageMessage: quoted.imageMessage } };
                }

                const buffer = await sock.downloadMediaMessage(messageToDownload);
                imageUrl = await uploadImage(buffer);
            }

            if (!imageUrl) {
                return sock.sendMessage(chat, {
                    text: `☬ *MEJORAR HD* ☬\n\n♡ Responde a una imagen con:\n> ${usedPrefix}hd\n\n♡ O usa link:\n> ${usedPrefix}hd https://...\n\n☬ *AKAME-MD* ♡`
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
