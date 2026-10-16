import axios from 'axios';
import { delineJson } from '../../lib/deline.ts';

export default {
    command: ['emojigif'],
    description: 'Convierte un emoji en sticker animado',
    category: 'stickers',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const emoji = (args || [])[0] || '';
        if (!emoji) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}emojigif <emoji>*\n✦ Ejemplo: *${p}emojigif 😀*` }, { quoted: msg });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🎨', key: msg.key } }).catch(() => null);
            const data = await delineJson('/maker/emojigif', { emoji });
            const url = data?.result?.url;
            if (!data?.status || !url) throw new Error('sin emoji');
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
            await sock.sendMessage(chat, { sticker: Buffer.from(res.data) }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: `✧ No encontré el emoji *${emoji}* animado.` }, { quoted: msg });
        }
    }
};
