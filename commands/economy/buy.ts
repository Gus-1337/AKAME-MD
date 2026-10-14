import { UserJid } from '#simple';
import { saveDB } from '#db';
import config from '#config';
import { ITEM_BY_ID, applyShopItem, buffRemaining, formatDuration, isBuffActive, titulo, money, ecoUser, bloqueadoPorAdmin } from '#shop';

export default {
    command: ['buy', 'comprar'],
    description: 'Compra un efecto o item de la tienda',
    category: 'economy',
    group: true,

    run: async ({ chat, m, sock, sender, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const coin = (config as any)?.coin || '¥enes';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });
        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const realSender = await UserJid(sock, chat, sender);
            const user = ecoUser(chat, realSender);
            if (!user) return reply('「 ꕤ 」 Este grupo aún no tiene economía activa.');

            const pedido = String(args[0] || '').toLowerCase().trim();
            if (!pedido) {
                return reply(`${titulo('COMPRAR')}\n\n✧ Uso › *${p}buy <nombre>*\n✧ Ejemplo › *${p}buy coinboost*\n✧ Catálogo › *${p}shop*`);
            }

            const item = ITEM_BY_ID[pedido];
            if (!item) return reply(`「 ✿ 」 *${pedido}* no existe en la tienda.\n> Mira el catálogo con *${p}shop*`);

            if ((user.coins || 0) < item.price) {
                const falta = item.price - (user.coins || 0);
                return reply(
                    `${titulo('SIN SALDO')}\n\n` +
                    `   No te alcanza para *${item.name}* ${item.emoji}\n\n` +
                    `✩ Precio › *${money(item.price)}* ${coin}\n` +
                    `✩ Tienes › *${money(user.coins || 0)}* ${coin}\n` +
                    `✩ Te faltan › *${money(falta)}* ${coin}`
                );
            }

            const antes = isBuffActive(user, item.id) ? buffRemaining(user, item.id) : 0;
            user.coins -= item.price;
            const { expiresAt } = applyShopItem(user, item);
            saveDB(chat, realSender);

            let txt = `${titulo('COMPRA HECHA')}\n\n   ${item.emoji} *${item.name}*\n\n`;
            txt += `✩ Pagaste › *${money(item.price)}* ${coin}\n`;
            txt += `✩ Saldo › *${money(user.coins || 0)}* ${coin}\n`;
            if (item.kind === 'buff' && expiresAt) {
                txt += `✩ Duración › *${formatDuration(buffRemaining(user, item.id))}*\n`;
                if (antes > 0) txt += `> ➕ Se sumó a los ${formatDuration(antes)} que ya tenías\n`;
                txt += `\n> ${item.effect}`;
            } else {
                txt += `\n> Guardado en tu mochila. Míralo con *${p}inventory*`;
            }
            return reply(txt);
        } catch (e) {
            console.error('Error en buy:', e);
            return reply('「 ꕤ 」 Ocurrió un error al comprar.');
        }
    }
};
