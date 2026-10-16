import { delineJson } from '../../lib/deline.ts';

export default {
    command: ['happymod', 'mods'],
    description: 'Busca apps mod en HappyMod',
    category: 'download',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const q = (args || []).join(' ').trim();
        if (!q) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}happymod <app o juego>*\n✦ Ejemplo: *${p}happymod subway surfers*` }, { quoted: msg });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🔎', key: msg.key } }).catch(() => null);
            const data = await delineJson('/search/happymod', { q });
            const lista = (data?.result || []).slice(0, 5);
            if (!data?.status || !lista.length) throw new Error('sin resultados');

            let texto =
                '╭─────────────────╮\n' +
                '   ✧ *HAPPYMOD* ✧\n' +
                '╰─────────────────╯\n\n';
            lista.forEach((a: any, i: number) => {
                texto += `*${i + 1}.* ${a.title || 'Sin nombre'}\n` +
                    `   ❖ Versión: ${a.version || '—'}\n` +
                    `   ✦ Tamaño: ${a.size || '—'}\n` +
                    `   ✦ ${a.page_dl || ''}\n\n`;
            });
            texto += '⋆ AKAME-MD ⋆';
            await sock.sendMessage(chat, { text: texto.trim() }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: `✧ No encontré mods para *${q}*.` }, { quoted: msg });
        }
    }
};
