import { UserJid } from '#simple';
import { titulo, money, ecoUser, bloqueadoPorAdmin } from '#shop';
import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['deposit', 'dep', 'd'],
    description: 'Deposita monedas en el banco (a salvo de robos)',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });
        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const jid = await UserJid(sock, chat, sender);
            const user = ecoUser(chat, jid);
            if (!user) return reply('「 ꕤ 」 Error: La base de datos no está inicializada.');
            const coin = (config as any)?.coin || '¥enes';
            const efectivo = user.coins || 0;

            const entrada = String(args[0] || '').toLowerCase().trim();
            if (!entrada) {
                return reply(
                    `${titulo('DEPÓSITO')}\n\n` +
                    `❀ Uso › *${p}dep <cantidad>* o *${p}dep all*\n` +
                    `✦ El banco protege tu dinero de los robos`
                );
            }

            const cantidad = (entrada === 'all' || entrada === 'todo')
                ? efectivo
                : parseInt(entrada.replace(/[^0-9]/g, ''));

            if (!cantidad || cantidad <= 0) return reply(`「 ꕤ 」 La cantidad no es válida.`);
            if (efectivo <= 0 || cantidad > efectivo) {
                return reply(`「 ꕤ 」 No tienes suficiente efectivo. Tienes *${money(efectivo)} ${coin}*.`);
            }

            user.coins = efectivo - cantidad;
            user.bank = (user.bank || 0) + cantidad;
            saveDB(chat, jid);

            return reply(
                `${titulo('DEPÓSITO')}\n\n` +
                `♡ Depositaste › *${money(cantidad)}* ${coin}\n` +
                `♡ Efectivo › *${money(user.coins)}* ${coin}\n` +
                `♡ Banco › *${money(user.bank)}* ${coin}`
            );
        } catch (e) {
            console.error('Error en deposit:', e);
            return reply('「 ꕤ 」 Ocurrió un error al depositar.');
        }
    }
};
