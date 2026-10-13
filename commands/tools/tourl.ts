import axios from 'axios';

const TOOLS_KEY = process.env.TOOLS_KEY || 'nyx_2rmMAKqdXlIkD9YLhMf29fU25Jo8rK1C';

export default {
    command: ['tourl', 'urlimg'],
    description: 'Sube una imagen (URL) a Catbox y devuelve un enlace permanente',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        const url = args.join(' ').trim();
        if (!/^https?:\/\//i.test(url)) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.tourl <enlace público de la imagen>*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });
            const { data } = await axios.get('https://nyxdlapi.vercel.app/api/tools/tourl', {
                params: { url, apikey: TOOLS_KEY },
                timeout: 60000
            });
            const nuevo = data?.result?.url || data?.url;
            if (!data?.status || !nuevo) throw new Error(data?.message || 'sin enlace');
            await sock.sendMessage(chat, { text: `✿ *LINK DE LA IMAGEN*\n\n> ${nuevo}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: `✿ No pude subir la imagen: ${e?.message || 'error'}` }, { quoted: m });
        }
    }
};
