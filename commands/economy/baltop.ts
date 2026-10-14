import config from '#config';
import { titulo, money, bloqueadoPorAdmin } from '#shop';

const MEDALLAS = ['🥇', '🥈', '🥉'];

export default {
    command: ['baltop', 'eboard', 'economytop'],
    description: 'Ranking de usuarios con más monedas del grupo',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });
        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const dbData = (global as any).db?.data;
            if (!dbData) return reply('「 ꕤ 」 Error: La base de datos no está inicializada.');
            const coin = (config as any)?.coin || '¥enes';

            const chatUsers = dbData.chats?.[chat]?.users || {};
            const entries = Object.entries(chatUsers)
                .map(([jid, data]: any) => ({ jid, total: (data.coins || 0) + (data.bank || 0) }))
                .filter((e) => e.total > 0)
                .sort((a, b) => b.total - a.total);

            if (!entries.length) return reply(`「 ꕤ 」 Nadie tiene *${coin}* todavía en este grupo.`);

            const porPagina = 10;
            const paginas = Math.ceil(entries.length / porPagina);
            const pagina = args[0] ? parseInt(String(args[0]).replace(/[^0-9]/g, '')) : 1;
            if (!pagina || pagina < 1 || pagina > paginas) {
                return reply(`「 ꕤ 」 Elige una página entre *1* y *${paginas}*.`);
            }

            const inicio = (pagina - 1) * porPagina;
            let txt = `${titulo('RANKING')}\n\n`;
            entries.slice(inicio, inicio + porPagina).forEach((e, i) => {
                const pos = inicio + i + 1;
                const nombre = dbData.users?.[e.jid]?.name || e.jid.split('@')[0];
                const medalla = MEDALLAS[pos - 1] || `✦${pos}`;
                txt += `${medalla} *${nombre}*\n     ✩ ${money(e.total)} ${coin}\n`;
            });
            txt += `\n> Página *${pagina}* de *${paginas}*`;
            if (pagina < paginas) txt += `\n> Siguiente: *${p}baltop ${pagina + 1}*`;

            return reply(txt);
        } catch (e) {
            console.error('Error en baltop:', e);
            return reply('「 ꕤ 」 Ocurrió un error al obtener el ranking.');
        }
    }
};
