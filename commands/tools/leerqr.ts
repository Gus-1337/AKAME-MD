import axios from 'axios';

const TOOLS_KEY = process.env.TOOLS_KEY || 'nyx_2rmMAKqdXlIkD9YLhMf29fU25Jo8rK1C';

export default {
    command: ['leerqr', 'qrread'],
    description: 'Lee el contenido de un código QR desde una imagen (URL)',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        const url = args.join(' ').trim();
        if (!/^https?:\/\//i.test(url)) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.leerqr <enlace de la imagen con el QR>*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });
            const { data } = await axios.get('https://nyxdlapi.vercel.app/api/tools/qr/read', {
                params: { url, apikey: TOOLS_KEY },
                timeout: 30000
            });
            const decoded = data?.result?.decoded;
            if (!data?.status || !decoded) throw new Error(data?.message || 'no se pudo leer el QR');
            await sock.sendMessage(chat, { text: `✿ *CONTENIDO DEL QR*\n\n> ${decoded}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: `✿ No pude leer el QR: ${e?.message || 'error'}` }, { quoted: m });
        }
    }
};
