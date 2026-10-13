import { UserJid } from '#simple';
import { saveDB } from '#db';
import config from '#config';
import { ITEM_BY_ID, applyShopItem, buffRemaining, formatDuration, isBuffActive } from '#shop';

export default {
    command: ['buy', 'comprar'],
    description: 'Comprar en tienda',
    category: 'economy',
    group: true,

    run: async ({ chat, m, sock, sender, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const coin = (config as any)?.coin || '¥enes';
        const realSender = await UserJid(sock, chat, sender);
        const chatUsers = (global as any).db?.data?.chats?.[chat]?.users;
        if (!chatUsers) return sock.sendMessage(chat, { text: '「 ✿ 」 Este grupo aún no tiene economía activa.' }, { quoted: m });

        const user = chatUsers[realSender] || (chatUsers[realSender] = { coins: 0, bank: 0 });
        const pedido = String(args[0] || '').toLowerCase().trim();

        if (!pedido) {
            return sock.sendMessage(chat, { text: `「 ✿ 」 Escribe qué comprar.\n> Ejemplo: *${p}buy coinboost*\n> Lista completa: *${p}shop*` }, { quoted: m });
        }

        const item = ITEM_BY_ID[pedido];
        if (!item) {
            return sock.sendMessage(chat, { text: `「 ✿ 」 *${pedido}* no existe en la tienda.\n> Mira el catálogo con *${p}shop*` }, { quoted: m });
        }

        const antes = isBuffActive(user, item.id) ? buffRemaining(user, item.id) : 0;
        if ((user.coins || 0) < item.price) {
            const falta = item.price - (user.coins || 0);
            return sock.sendMessage(chat, {
                text: `「 ✿ 」 No te alcanza para *${item.name}* ${item.emoji}\n> Cuesta *${item.price.toLocaleString()}* ${coin} y tienes *${(user.coins || 0).toLocaleString()}*\n> Te faltan *${falta.toLocaleString()}* ${coin}`
            }, { quoted: m });
        }

        user.coins -= item.price;
        const { expiresAt } = applyShopItem(user, item);
        saveDB(chat, realSender);

        let txt =
`╭─〔 ${item.emoji} COMPRA HECHA 〕─
│ ✧ *${item.name}*
╰───────────────
> 💸 Pagaste *${item.price.toLocaleString()}* ${coin}
> 💰 Balance » *${(user.coins || 0).toLocaleString()}* ${coin}\n`;

        if (item.kind === 'buff' && expiresAt) {
            const restante = buffRemaining(user, item.id);
            txt += `> ⏳ Duración » *${formatDuration(restante)}*\n`;
            if (antes > 0) txt += `> ➕ Se sumó a los ${formatDuration(antes)} que ya tenías\n`;
            txt += `\n✧ ${item.effect}`;
        } else {
            txt += `\n✧ Lo guardé en tu inventario. Míralo con *${p}inventory*`;
        }

        return sock.sendMessage(chat, { text: txt }, { quoted: m });
    }
};
