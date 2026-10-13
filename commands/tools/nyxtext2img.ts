import axios from 'axios';

const NYX_KEY = process.env.NYX_KEY || 'nyx_2rmMAKqdXlIkD9YLhMf29fU25Jo8rK1C';

export default {
    command: ['text2img', 'txt2img', 'imgia'],
    description: 'Genera una imagen con IA a partir de un texto',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        const texto = args.join(' ').trim();
        if (!texto) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.imgia <descripción>*\nEjemplo: *.imgia gato mágico en la luna*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🎨', key: m.key } });
            const { data } = await axios.get('https://nyxdlapi.vercel.app/api/tools/text2img', {
                params: { text: texto, apikey: NYX_KEY },
                timeout: 90000
            });
            const img = data?.result?.image;
            if (!data?.status || typeof img !== 'string') throw new Error(data?.message || 'sin imagen');
            await sock.sendMessage(chat, { image: { url: img }, caption: `✿ *IMAGEN IA*\n> ${texto}` }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: `✿ No pude generar la imagen: ${e?.message || 'error'}` }, { quoted: m });
        }
    }
};
