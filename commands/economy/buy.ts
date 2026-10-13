import { UserJid } from '#simple';
import { saveDB } from '#db';

const PRICES: Record<string, number> = { premium: 10000, coinboost: 5000, robprotect: 3000 };

export default {
    command: ['buy', 'comprar'],
    description: 'Comprar en tienda',
    category: 'economy',
    group: true,

    run: async ({ chat, m, sock, sender, args }: any) => {
        const realSender = await UserJid(sock, chat, sender);
        const chatUsers = (global as any).db.data.chats[chat].users;
        const user = chatUsers[realSender] || (chatUsers[realSender] = { coins: 0, inventory: {} });

        const item = args[0]?.toLowerCase();
        if (!PRICES[item]) {
            return sock.sendMessage(chat, { text: `「✿」 Item no existe. Usa *.shop*` }, { quoted: m });
        }
        if ((user.coins || 0) < PRICES[item]) {
            return sock.sendMessage(chat, { text: `「✿」 No tienes suficientes coins` }, { quoted: m });
        }

        user.coins -= PRICES[item];
        if (!user.inventory) user.inventory = {};
        user.inventory[item] = (user.inventory[item] || 0) + 1;
        saveDB(chat, realSender);

        await sock.sendMessage(chat, { text: `「✅」 Compraste *${item}* por ${PRICES[item]}` }, { quoted: m });
    }
};
