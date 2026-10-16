import axios from 'axios';
import { stellarUrl } from '../../lib/stellar.ts';

export default {
    command: ['tinyurl', 'acortar'],
    description: 'Acorta un link',
    category: 'tools',
    run: async ({ chat, m, sock, args, usedPrefix }: any) => {
        const link = (args || []).join(' ').trim();
        const p = usedPrefix || '.';
        if (!link) {
            return sock.sendMessage(chat, {
                text: `✿ Usa: *${p}tinyurl <link>*\n✿ Ejemplo: *${p}tinyurl https://google.com*`
            }, { quoted: m });
        }
        if (!/^https?:\/\//i.test(link)) {
            return sock.sendMessage(chat, { text: '✿ El link debe empezar con https://' }, { quoted: m });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '🔗', key: m.key } }).catch(() => null);
            const { data } = await axios.get(stellarUrl('/short/tinyurl', { url: link }), { timeout: 20000 });
            if (!data?.status || !data?.shortUrl) throw new Error('sin enlace');

            await sock.sendMessage(chat, {
                text: `✿ *Link acortado*\n\n🔗 ${data.shortUrl}\n\n> AKAME-MD 🌸`
            }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
            return sock.sendMessage(chat, { text: '✿ No pude acortar ese link, intenta de nuevo.' }, { quoted: m });
        }
    }
};
