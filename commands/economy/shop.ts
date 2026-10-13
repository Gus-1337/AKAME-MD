import config from '#config';
import { SHOP_ITEMS, buffRemaining, formatDuration, isBuffActive } from '#shop';

export default {
    command: ['shop', 'tienda'],
    description: 'Tienda de items, compra con .buy',
    category: 'economy',
    group: true,

    run: async ({ chat, m, sock, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const coin = (config as any)?.coin || '¥enes';
        const realSender = sender || m?.sender;
        const user = (global as any).db?.data?.chats?.[chat]?.users?.[realSender];

        let txt =
`╭─〔 🛒 TIENDA AKAME 〕─
│ ✧ Gasta tus *${coin}* en efectos reales
╰───────────────

`;

        for (const item of SHOP_ITEMS) {
            const activo = item.kind === 'buff' && isBuffActive(user, item.id);
            txt += `${item.emoji} *${item.name}*${activo ? '  ✅' : ''}\n`;
            txt += `> ${item.effect}\n`;
            txt += activo
                ? `> ⏳ Activo por *${formatDuration(buffRemaining(user, item.id))}*\n`
                : `> 💰 *${item.price.toLocaleString()}* ${coin}\n`;
            txt += '\n';
        }

        txt +=
`╭─〔 ✧ CÓMO COMPRAR 〕─
│ • ${p}buy <nombre>
│ • Ejemplo » *${p}buy coinboost*
╰───────────────
> Los efectos arrancan al comprar y duran su tiempo.
> Si recompras uno activo, el tiempo se *suma*.
> Mira lo que tienes con *${p}inventory*`;

        const activos = SHOP_ITEMS.filter((i) => i.kind === 'buff' && isBuffActive(user, i.id));
        if (activos.length) {
            txt += `\n\n⚡ *Tus efectos activos*\n`;
            txt += activos.map((i) => `> ${i.emoji} ${i.name} — *${formatDuration(buffRemaining(user, i.id))}*`).join('\n');
        }

        return sock.sendMessage(chat, { text: txt }, { quoted: m });
    }
};
