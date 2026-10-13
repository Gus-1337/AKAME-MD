import axios from 'axios';

const TOOLS_KEY = process.env.TOOLS_KEY || 'nyx_2rmMAKqdXlIkD9YLhMf29fU25Jo8rK1C';

export default {
    command: ['shorturl', 'acortar'],
    description: 'Acorta un enlace',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        const url = args.join(' ').trim();
        if (!/^https?:\/\//i.test(url)) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.acortar <enlace>*\nEjemplo: *.acortar https://youtu.be/jNQXAC9IVRw*' }, { quoted: m });
        }
        try {
            const { data } = await axios.get('https://nyxdlapi.vercel.app/api/tools/shorturl', {
                params: { url, apikey: TOOLS_KEY },
                timeout: 20000
            });
            const corto = data?.result?.shortened;
            if (!data?.status || !corto) throw new Error(data?.message || 'sin resultado');
            return sock.sendMessage(chat, { text: `✿ *ENLACE ACORTADO*\n\n> ${corto}\n\n_Original: ${url}_` }, { quoted: m });
        } catch (e: any) {
            return sock.sendMessage(chat, { text: `✿ No pude acortar el enlace: ${e?.message || 'error'}` }, { quoted: m });
        }
    }
};
