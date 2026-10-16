import axios from 'axios';
import { stellarUrl } from '../../lib/stellar.ts';

export default {
    command: ['letra', 'lyrics', 'lyric'],
    category: 'download',
    description: 'Busca la letra de una canción',
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const query = args.join(' ');
        if (!query) {
            return sock.sendMessage(chat, {
                text: `✿ Usa: .letra Ozuna odisea\n✿ Ejemplo: .letra Bad Bunny DTMF`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, { react: { text: "🎧", key: msg.key } });

            // Principal: faa. Si falla, respaldo: Stellar.
            let r: any = null;
            try {
                const api = `https://api-faa.my.id/faa/lyrics?q=${encodeURIComponent(query)}`;
                const { data } = await axios.get(api, { timeout: 15000 });
                if (data?.status && data?.result?.lyrics) r = data.result;
            } catch { /* sigue con el respaldo */ }

            if (!r) {
                try {
                    const { data } = await axios.get(stellarUrl('/tools/lyrics', { query }), { timeout: 15000 });
                    const x = data?.data?.[0];
                    if (data?.status && x?.lyrics) r = { title: x.title, artist: x.artist, lyrics: x.lyrics };
                } catch { /* sin letra */ }
            }

            if (!r) {
                return sock.sendMessage(chat, { text: `❌ No encontré letra para "${query}"` }, { quoted: msg });
            }
            // limpiamos los [00:09.04]
            const cleanLyrics = r.lyrics.replace(/\[\d+:\d+\.\d+\]/g, '').trim();

            const text = `*${r.title} - ${r.artist}*\n` +
                         `✿ Álbum: ${r.album || 'Desconocido'}\n` +
                         `✿ Género: ${r.genre || 'Desconocido'}\n\n` +
                         `${cleanLyrics}\n\n` +
                         `🔗 ${r.share_url || ''}`;

            // Mandamos con la portada
            if (r.cover?.large) {
                await sock.sendMessage(chat, {
                    image: { url: r.cover.large },
                    caption: text
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chat, { text: text }, { quoted: msg });
            }

            await sock.sendMessage(chat, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.log('[LETRA]', e.message);
            await sock.sendMessage(chat, { text: `❌ Error buscando la letra` }, { quoted: msg });
        }
    }
};
