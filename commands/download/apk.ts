import axios from 'axios';
import type { WASocket } from '@whiskeysockets/baileys';

export default {
    command: ['apk', 'apkdl', 'modapk'],
    description: 'Descargador de APKs',
    category: 'download',

    run: async ({ sock, m, chat, args }: { sock: WASocket; m: any; chat: string; args: string[] }): Promise<void> => {
        if (!args[0]) {
            await sock.sendMessage(chat, { text: '✿ Dime el nombre de la apk bb\n\nEjemplo: *.apk simcity*' }, { quoted: m });
            return;
        }

        const query = args.join(' ');

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });

            const { data } = await axios.get(`https://api.delirius.online/download/apk?query=${encodeURIComponent(query)}`);

            if (!data.status ||!data.data) {
                await sock.sendMessage(chat, { text: `♡ AKAME-MD ♡\n\nLo siento bb no encontré *${query}*` }, { quoted: m });
                return;
            }

            const apk = data.data;
            const caption = `♡ AKAME-MD - APK DOWNLOADER ♡

✿ *Nombre:* ${apk.name}
✿ *ID:* ${apk.id}
✿ *Peso:* ${apk.size}
✿ *Developer:* ${apk.developer}
✿ *Publicado:* ${apk.publish}
✿ *Descargas:* ${apk.stats.downloads}

♡ Enviando archivo bb, espera ✿`;

            await sock.sendMessage(chat, {
                image: { url: apk.image },
                caption: caption
            }, { quoted: m });

            await sock.sendMessage(chat, {
                document: { url: apk.download },
                mimetype: 'application/vnd.android.package-archive',
                fileName: `${apk.name}.apk`,
                caption: `✿ Aquí tienes *${apk.name}* ♡`
            }, { quoted: m });

            await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });

        } catch (e: any) {
            console.error(e);
            await sock.sendMessage(chat, { text: `✿ Error al descargar la apk bb\n> ${e.message}` }, { quoted: m });
        }
    }
};
