import { UserJid } from '#simple';
import config from '#config';
import { SHOP_ITEMS, buffRemaining, countOf, ensureInventory, formatDuration, isBuffActive } from '#shop';

export default {
    command: ['inventory', 'inv', 'inventario'],
    description: 'Ver inventario',
    category: 'economy',
    group: true,

    run: async ({ chat, m, sock, sender }: any) => {
        const coin = (config as any)?.coin || '¥enes';
        const realSender = await UserJid(sock, chat, sender);
        const user = (global as any).db?.data?.chats?.[chat]?.users?.[realSender];
        const inv = ensureInventory(user);

        const efectos = SHOP_ITEMS.filter((i) => isBuffActive(user, i.id));
        const coleccionables = Object.entries(inv).filter(([k, v]) => typeof v === 'number' && (v as number) > 0);

        let txt =
`╭─〔 🎒 INVENTARIO 〕─
│ ✧ *${(user?.coins || 0).toLocaleString()}* ${coin} en efectivo
╰───────────────

`;

        txt += `⚡ *Efectos activos* (${efectos.length})\n`;
        if (efectos.length) {
            txt += efectos
                .map((i) => `> ${i.emoji} *${i.name}* — ${formatDuration(buffRemaining(user, i.id))}`)
                .join('\n');
        } else {
            txt += `> ✿ Ninguno. Compra uno con *.shop*`;
        }

        txt += `\n\n🐟 *Coleccionables* (${coleccionables.reduce((a, [, v]) => a + (v as number), 0)} unidades)\n`;
        if (coleccionables.length) {
            txt += coleccionables
                .sort((a, b) => (b[1] as number) - (a[1] as number))
                .map(([k, v]) => `> • ${k} × ${v}`)
                .join('\n');
        } else {
            txt += `> ✿ Vacío. Pesca con *.fish* o caza con *.cazar*`;
        }

        const guardados = SHOP_ITEMS.filter((i) => i.kind === 'item' && countOf(user, i.id) > 0);
        if (guardados.length) {
            txt += `\n\n🧿 *Objetos*\n`;
            txt += guardados.map((i) => `> ${i.emoji} ${i.name} × ${countOf(user, i.id)}`).join('\n');
        }

        return sock.sendMessage(chat, { text: txt }, { quoted: m });
    }
};
