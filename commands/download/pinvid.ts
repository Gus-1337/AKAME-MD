import axios from 'axios';

const DELIRIUS = ((global as any).APIs?.delirius?.url || 'https://api.delirius.online').replace(/\/+$/, '');

const esPinterest = (url: string) => /^https?:\/\/(www\.|[a-z]{2}\.)?(pinterest\.[a-z.]+|pin\.it)\//i.test(url);

export default {
    command: ['pinvid'],
    category: 'download',
    description: 'Descarga el video de un pin de Pinterest',
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const url = (args?.[0] || '').trim();

        if (!url) {
            return sock.sendMessage(chat, {
                text: `☬ *AKAME - PINVID* ☬\n\n♡ *Usa:*\n> ${usedPrefix}pinvid <link del pin>\n\n♡ *Ejemplo:*\n> ${usedPrefix}pinvid https://pin.it/xxxxx`
            }, { quoted: msg });
        }

        if (!esPinterest(url)) {
            return sock.sendMessage(chat, {
                text: `☬ *AKAME-MD* ☬\n\n♡ Ese link no es de Pinterest.`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } }).catch(() => {});

            const { data } = await axios.get(`${DELIRIUS}/download/pinterestdl`, {
                params: { url },
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const pin = data?.data;
            const media = pin?.download;
            if (!data?.status || !media?.url) throw new Error('No encontré el pin');
            if (media.type !== 'video') {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
                return sock.sendMessage(chat, {
                    text: `☬ *AKAME-MD* ☬\n\n♡ Ese pin no tiene video, solo imagen.`
                }, { quoted: msg });
            }

            await sock.sendMessage(chat, {
                video: { url: media.url },
                mimetype: 'video/mp4',
                caption: `☬ *PINTEREST VIDEO* ☬\n\n♡ *Título:* ${pin.title || 'Sin título'}\n♡ *Autor:* ${pin.author_name || pin.username || 'Desconocido'}\n\n☬ *AKAME-MD* ♡`
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => {});
        } catch (e) {
            console.log('[PINVID ERROR]', e.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
            await sock.sendMessage(chat, {
                text: `☬ *AKAME-MD* ☬\n\n♡ No pude descargar ese video. Revisa que el link sea de un pin con video.`
            }, { quoted: msg });
        }
    }
};
