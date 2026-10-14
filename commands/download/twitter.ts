import axios from 'axios';

const base = 'https://apis-starlights-team.koyeb.app/starlight';

export default {
    command: ['twitter', 'x', 'twdl'],
    description: 'Descarga videos de Twitter / X',
    category: 'download',
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const url = args[0];
        if (!url) return sock.sendMessage(chat, { text: `🐦 Usa: .twitter https://x.com/usuario/status/123` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } });

            const { data } = await axios.get(`${base}/twitter-dl?url=${encodeURIComponent(url)}`, { timeout: 30000 });
            const info = data?.data;
            if (!info?.video || typeof info.video !== 'string') throw new Error('sin video');

            await sock.sendMessage(chat, { react: { text: '📤', key: msg.key } });

            const caption = [
                `🐦 *${String(info.title || 'Video de Twitter').trim()}*`,
                '┄┄┄',
                `⏱ Duración » ${info.duration || '?'}`,
                '',
                '> AKAME-MD 🌸'
            ].join('\n');

            await sock.sendMessage(chat, {
                video: { url: info.video },
                caption,
                mimetype: 'video/mp4'
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });
        } catch (e) {
            console.log('[TWITTER ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: `🐦 No pude descargar ese video. Revisa que el enlace tenga video.` }, { quoted: msg });
        }
    }
};
