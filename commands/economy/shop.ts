import config from '#config';
import { SHOP_ITEMS, buffRemaining, formatDuration, isBuffActive, titulo, money } from '#shop';

export default {
    command: ['shop', 'tienda'],
    description: 'Tienda de efectos, compra con .buy',
    category: 'economy',
    group: true,

    run: async ({ chat, m, sock, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const coin = (config as any)?.coin || '¥enes';
        const realSender = sender || m?.sender;
        const user = (global as any).db?.data?.chats?.[chat]?.users?.[realSender];

        let txt = `${titulo('TIENDA')}\n\n`;
        for (const item of SHOP_ITEMS) {
            const activo = item.kind === 'buff' && isBuffActive(user, item.id);
            txt += `${item.emoji} *${item.name}*${activo ? ' ✅' : ''}\n`;
            txt += `     ${item.effect}\n`;
            txt += activo
                ? `     ⏳ Activo por *${formatDuration(buffRemaining(user, item.id))}*\n`
                : `     ♡ Precio › *${money(item.price)}* ${coin}\n`;
            txt += '\n';
        }

        txt += `❀ Comprar › *${p}buy <nombre>*\n`;
        txt += `❀ Ejemplo › *${p}buy coinboost*\n`;
        txt += `> Si recompras un efecto activo, el tiempo se *suma*.\n`;
        txt += `> Tu mochila: *${p}inventory*`;

        const activos = SHOP_ITEMS.filter((i) => i.kind === 'buff' && isBuffActive(user, i.id));
        if (activos.length) {
            txt += `\n\n⚡ *Tus efectos activos*\n`;
            txt += activos.map((i) => `> ${i.emoji} ${i.name} — *${formatDuration(buffRemaining(user, i.id))}*`).join('\n');
        }

        return sock.sendMessage(chat, { text: txt }, { quoted: m });
    }
};
