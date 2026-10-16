import { delineJson } from '../../lib/deline.ts';

export default {
    command: ['applemusic', 'amusic'],
    description: 'Busca canciones en Apple Music',
    category: 'download',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const q = (args || []).join(' ').trim();
        if (!q) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}applemusic <canción>*\n✦ Ejemplo: *${p}applemusic despacito*` }, { quoted: msg });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🎵', key: msg.key } }).catch(() => null);
            const data = await delineJson('/search/applemusic', { q });
            const lista = (data?.result || []).slice(0, 5);
            if (!data?.status || !lista.length) throw new Error('sin resultados');

            let texto =
                '╭─────────────────╮\n' +
                '   ✧ *APPLE MUSIC* ✧\n' +
                '╰─────────────────╯\n\n';
            lista.forEach((a: any, i: number) => {
                texto += `*${i + 1}.* ${a.title || 'Sin título'}\n` +
                    `   ✦ ${a.song || ''}\n\n`;
            });
            texto += '⋆ AKAME-MD ⋆';
            await sock.sendMessage(chat, { text: texto.trim() }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: `✧ No encontré canciones para *${q}*.` }, { quoted: msg });
        }
    }
};
