import axios from 'axios';

const TOOLS_KEY = process.env.TOOLS_KEY || 'nyx_2rmMAKqdXlIkD9YLhMf29fU25Jo8rK1C';

export default {
    command: ['qr', 'qrcreate'],
    description: 'Genera un código QR de un texto o enlace',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        const texto = args.join(' ').trim();
        if (!texto) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.qr <texto o enlace>*\nEjemplo: *.qr https://github.com*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });
            const { data } = await axios.get('https://nyxdlapi.vercel.app/api/tools/qr/create', {
                params: { text: texto, apikey: TOOLS_KEY },
                timeout: 30000
            });
            const b64 = data?.result?.base64;
            if (!data?.status || typeof b64 !== 'string') throw new Error(data?.message || 'sin imagen');
            const buffer = Buffer.from(b64.split(',').pop() as string, 'base64');
            await sock.sendMessage(chat, { image: buffer, caption: `✿ *QR generado*\n> ${texto}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: `✿ No pude generar el QR: ${e?.message || 'error'}` }, { quoted: m });
        }
    }
};
