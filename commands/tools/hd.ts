import fetch from 'node-fetch';
import { FormData, Blob } from 'formdata-node';

async function uploadToCatbox(buffer) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', new Blob([buffer]), 'image.jpg');
  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form
  });
  return await res.text();
}

export default {
    command: ['hd', 'superhd', 'mejorar', 'enhance'],
    category: 'tools',
    description: 'Mejora imagen a HD 4K',
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const hasImage = msg.message?.imageMessage || quoted?.imageMessage;

        try {
            let imageUrl = args[0];

            // Si responde a una imagen
            if (!imageUrl && hasImage) {
                await sock.sendMessage(chat, { text: `☬ *AKAME-MD* ☬\n\n♡ Mejorando imagen a HD... espera pa` }, { quoted: msg });

                const buffer = await sock.downloadMediaMessage(
                    msg.message?.imageMessage? msg : { message: { imageMessage: quoted.imageMessage } }
                );

                imageUrl = await uploadToCatbox(buffer);
            }

            if (!imageUrl) {
                return sock.sendMessage(chat, {
                    text: `☬ *MEJORAR IMAGEN HD* ☬\n\n♡ *Usa:*\n> Responde a una imagen con.hd\n> O.hd <link de imagen>\n\n☬ *AKAME-MD* ♡`
                }, { quoted: msg });
            }

            const apiUrl = `https://api-faa.my.id/faa/superhd?url=${encodeURIComponent(imageUrl)}`;

            await sock.sendMessage(chat, {
                image: { url: apiUrl },
                caption: `☬ *IMAGEN MEJORADA* ☬\n\n♡ *Calidad:* HD 4K\n♡ *Estado:* Mejorada con éxito\n\n☬ *AKAME-MD* ♡`
            }, { quoted: msg });

        } catch (e) {
            console.log('[HD ERROR]', e);
            await sock.sendMessage(chat, { text: `☬ *AKAME-MD* ☬\n\n♡ Error al mejorar: ${e.message}` }, { quoted: msg });
        }
    }
};
