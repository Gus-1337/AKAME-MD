import axios from 'axios';

const BASE = 'https://apis-starlights-team.koyeb.app/starlight';

export default {
    command: ['soundcloud', 'sc'],
    description: 'Busca canciones en SoundCloud',
    category: 'download',
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const query = args.join(' ').trim();
        if (!query) return sock.sendMessage(chat, { text: `🎵 Usa: .soundcloud <canción o artista>` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: '🔎', key: msg.key } });

            const { data } = await axios.get(`${BASE}/soundcloud-search?text=${encodeURIComponent(query)}`, { timeout: 30000 });
            const lista = (Array.isArray(data) ? data : []).filter((r) => r?.url).slice(0, 5);
            if (!lista.length) {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
                return sock.sendMessage(chat, { text: `🎵 No encontré resultados para *${query}*` }, { quoted: msg });
            }

            const texto = [
                `🎵 *SoundCloud* · ${query}`,
                '┄┄┄',
                ...lista.map((r, i) =>
                    `${i + 1}. *${r.title}*\n   👤 ${r.artist || 'Desconocido'} · ⏱ ${r.duration || '?'} · ▶ ${r.repro || '?'}\n   🔗 ${r.url}`
                ),
                '',
                '> AKAME-MD 🌸'
            ].join('\n');

            await sock.sendMessage(chat, { text: texto }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });
        } catch (e) {
            console.log('[SOUNDCLOUD ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: `🎵 Error al buscar en SoundCloud, intenta de nuevo` }, { quoted: msg });
        }
    }
};
