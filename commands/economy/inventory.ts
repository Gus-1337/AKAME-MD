import { UserJid } from '#simple';
import config from '#config';
import { SHOP_ITEMS, buffRemaining, countOf, ensureInventory, formatDuration, isBuffActive, titulo, money } from '#shop';

export default {
    command: ['inventory', 'inv', 'inventario', 'mochila'],
    description: 'Mira tu mochila: efectos, colección y objetos',
    category: 'economy',
    group: true,

    run: async ({ chat, m, sock, sender, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const coin = (config as any)?.coin || '¥enes';
        const realSender = await UserJid(sock, chat, sender);
        const user = (global as any).db?.data?.chats?.[chat]?.users?.[realSender];
        const inv = ensureInventory(user);

        const efectos = SHOP_ITEMS.filter((i) => i.kind === 'buff' && isBuffActive(user, i.id));
        const coleccion = Object.entries(inv).filter(([, v]) => typeof v === 'number' && (v as number) > 0) as [string, number][];
        const objetos = SHOP_ITEMS.filter((i) => i.kind === 'item' && countOf(user, i.id) > 0);
        const totalColeccion = coleccion.reduce((a, [, v]) => a + v, 0);

        let txt = `${titulo('MOCHILA')}\n\n`;
        txt += `❀ Efectivo › *${money(user?.coins || 0)}* ${coin}\n\n`;

        txt += `⚡ *Efectos activos* (${efectos.length})\n`;
        txt += efectos.length
            ? efectos.map((i) => `   ${i.emoji} ${i.name} — ${formatDuration(buffRemaining(user, i.id))}`).join('\n')
            : `   ✿ Ninguno. Compra uno con *${p}shop*`;

        txt += `\n\n🐟 *Colección* (${totalColeccion})\n`;
        txt += coleccion.length
            ? coleccion.sort((a, b) => b[1] - a[1]).map(([k, v]) => `   • ${k} × ${v}`).join('\n')
            : `   ✿ Vacía. Pesca con *${p}fish* o caza con *${p}cazar*`;

        if (objetos.length) {
            txt += `\n\n🧿 *Objetos*\n`;
            txt += objetos.map((i) => `   ${i.emoji} ${i.name} × ${countOf(user, i.id)}`).join('\n');
        }

        return sock.sendMessage(chat, { text: txt }, { quoted: m });
    }
};
