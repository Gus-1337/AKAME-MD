import { UserJid } from '#simple';

export default {
    command: ['inventory', 'inv', 'inventario'],
    description: 'Ver inventario',
    category: 'economy',
    group: true,

    run: async ({ chat, m, sock, sender }: any) => {
        const realSender = await UserJid(sock, chat, sender);
        const user = (global as any).db.data.chats[chat].users[realSender];
        if (!user?.inventory) return sock.sendMessage(chat, { text: `「✿」 Inventario vacío` }, { quoted: m });

        const txt = `「🎒」 *INVENTARIO*\n\n` + Object.entries(user.inventory).map(([k, v]) => `• ${k}: ${v}`).join('\n');
        await sock.sendMessage(chat, { text: txt }, { quoted: m });
    }
};
