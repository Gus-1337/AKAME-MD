import axios from 'axios';
import type { WASocket } from '@whiskeysockets/baileys';

export default {
    command: ['mediafire', 'mf', 'mfire'],
    description: 'Descargador de Mediafire',
    category: 'download',

    run: async ({ sock, m, chat, args }: { sock: WASocket; m: any; chat: string; args: string[] }): Promise<void> => {
        if (!args[0]) {
            await sock.sendMessage(chat, { text: '✿ Pasa el link de mediafire bb\n\nEjemplo: *.mf https://www.mediafire.com/file/xxxxx/file*' }, { quoted: m });
            return;
        }

        const url = args[0];
        if (!url.includes('mediafire.com')) {
            await sock.sendMessage(chat, { text: '✿ Ese no es un link de mediafire bb ✿' }, { quoted: m });
            return;
        }

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });

            const { data } = await axios.get(`https://api.delirius.online/download/mediafire?url=${encodeURIComponent(url)}`);

            // Si es carpeta
            if (data.datos && Array.isArray(data.datos)) {
                let list = `♡ AKAME-MD - MEDIAFIRE FOLDER ♡\n\n✿ Carpeta: ${data.carpeta || 'Desconocida'}\n✿ Archivos: ${data.datos.length}\n\n`;
                data.datos.slice(0, 15).forEach((f: any, i: number) => {
                    const name = f['nombre de archivo'] || f.filename || 'sin nombre';
                    const size = f.tamaño || f.size || '?';
                    list += `*${i + 1}.* ${name} - ${size} bytes\n> ${f.link}\n\n`;
                });

                if (data.datos.length > 15) list += `✿...y ${data.datos.length - 15} archivos más ♡`;

                await sock.sendMessage(chat, { text: list }, { quoted: m });
                await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
                return;
            }

            // Si es archivo directo (otras apis de delirius devuelven diferente)
            // Intentamos con la otra estructura también
            const fileData = data.data || data.result || data;

            if (fileData.filename || fileData.name) {
                const filename = fileData.filename || fileData.name;
                const filesize = fileData.size || fileData.filesize || '';
                const dl = fileData.link || fileData.url || fileData.download || fileData.dl;

                const caption = `♡ AKAME-MD - MEDIAFIRE ♡\n\n✿ *Nombre:* ${filename}\n✿ *Peso:* ${filesize}\n✿ *Link:* ${url}\n\n♡ Enviando archivo bb ✿`;

                await sock.sendMessage(chat, { text: caption }, { quoted: m });

                if (dl) {
                    await sock.sendMessage(chat, {
                        document: { url: dl },
                        mimetype: fileData.mime || 'application/octet-stream',
                        fileName: filename
                    }, { quoted: m });
                }
                await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
                return;
            }

            await sock.sendMessage(chat, { text: `♡ No pude leer el link bb\n> ${JSON.stringify(data).slice(0, 500)}` }, { quoted: m });

        } catch (e: any) {
            console.error(e);
            await sock.sendMessage(chat, { text: `✿ Error con mediafire bb\n> ${e.message}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
        }
    }
};
