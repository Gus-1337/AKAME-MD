import { delineJson } from '../../lib/deline.ts';

export default {
    command: ['playstore', 'playstoresearch'],
    description: 'Busca apps en Google Play',
    category: 'tools',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const q = (args || []).join(' ').trim();
        if (!q) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}playstore <app>*\n✦ Ejemplo: *${p}playstore whatsapp*` }, { quoted: msg });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🔎', key: msg.key } }).catch(() => null);
            const data = await delineJson('/search/playstore', { q });
            const lista = (data?.result || []).slice(0, 5);
            if (!data?.status || !lista.length) throw new Error('sin resultados');

            let texto =
                '╭─────────────────╮\n' +
                '   ✧ *PLAY STORE* ✧\n' +
                '╰─────────────────╯\n\n';
            lista.forEach((a: any, i: number) => {
                texto += `*${i + 1}.* ${a.nama || 'Sin nombre'}\n` +
                    `   ❖ Desarrollador: ${a.developer || '—'}\n` +
                    `   ✦ Calificación: ${a.rate2 || '—'}\n` +
                    `   ✦ ${a.link}\n\n`;
            });
            texto += '⋆ AKAME-MD ⋆';
            await sock.sendMessage(chat, { text: texto.trim() }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: `✧ No encontré apps para *${q}*.` }, { quoted: msg });
        }
    }
};
