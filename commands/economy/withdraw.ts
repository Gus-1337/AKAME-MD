import { UserJid } from '#simple';
import { titulo, money, ecoUser, bloqueadoPorAdmin } from '#shop';
import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['with', 'withdraw', 'retirar', 'wd'],
    description: 'Retira monedas del banco a tu efectivo',
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
            const banco = user.bank || 0;

            const entrada = String(args[0] || '').toLowerCase().trim();
            if (!entrada) {
                return reply(
                    `${titulo('RETIRO')}\n\n` +
                    `❀ Uso › *${p}with <cantidad>* o *${p}with all*\n` +
                    `✦ Ojo: el efectivo sí puede ser robado`
                );
            }

            const cantidad = (entrada === 'all' || entrada === 'todo')
                ? banco
                : parseInt(entrada.replace(/[^0-9]/g, ''));

            if (!cantidad || cantidad <= 0) return reply(`「 ꕤ 」 La cantidad no es válida.`);
            if (banco <= 0 || cantidad > banco) {
                return reply(`「 ꕤ 」 No tienes suficiente en el banco. Tienes *${money(banco)} ${coin}*.`);
            }

            user.bank = banco - cantidad;
            user.coins = (user.coins || 0) + cantidad;
            saveDB(chat, jid);

            return reply(
                `${titulo('RETIRO')}\n\n` +
                `♡ Retiraste › *${money(cantidad)}* ${coin}\n` +
                `♡ Efectivo › *${money(user.coins)}* ${coin}\n` +
                `♡ Banco › *${money(user.bank)}* ${coin}`
            );
        } catch (e) {
            console.error('Error en withdraw:', e);
            return reply('「 ꕤ 」 Ocurrió un error al retirar.');
        }
    }
};
