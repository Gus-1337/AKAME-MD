import axios from 'axios';

const NYX_KEY = process.env.NYX_KEY || 'nyx_2rmMAKqdXlIkD9YLhMf29fU25Jo8rK1C';

export default {
    command: ['removebg', 'quitarfondo', 'rmbg'],
    description: 'Quita el fondo de una imagen (URL)',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        const url = args.join(' ').trim();
        if (!/^https?:\/\//i.test(url)) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.removebg <enlace de la imagen>*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });
            const { data } = await axios.get('https://nyxdlapi.vercel.app/api/tools/removebg', {
                params: { url, apikey: NYX_KEY },
                timeout: 60000
            });
            const img = data?.result?.image || data?.image;
            if (!data?.status || typeof img !== 'string') throw new Error(data?.message || 'sin imagen');

            // La API puede devolver base64 o una URL
            const buffer = img.startsWith('data:')
                ? Buffer.from(img.split(',').pop() as string, 'base64')
                : (await axios.get(img, { responseType: 'arraybuffer', timeout: 60000 })).data;

            await sock.sendMessage(chat, { image: Buffer.from(buffer), caption: '✿ *Fondo quitado*' }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: `✿ No pude quitar el fondo: ${e?.message || 'error'}` }, { quoted: m });
        }
    }
};
