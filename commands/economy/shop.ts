// shop.js
export default {
    command: ['shop', 'tienda'],
    description: 'Tienda',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock }) => {
        let text = `「🛒」 *TIENDA AKAME*\n\n1. premium - 10000 ¥enes - Acceso premium\n2. coinboost - 5000 ¥enes - x2 coins por 1h\n3. robprotect - 3000 ¥enes - Anti robo 1h\n\nUsa *.buy <nombre>*`;
        await sock.sendMessage(chat, { text }, { quoted: m });
    }
};
// buy.js
import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';
export default {
    command: ['buy', 'comprar'],
    description: 'Comprar en tienda',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, sender, args }) => {
        const realSender = await UserJid(sock, chat, sender);
        const chatUsers = global.db.data.chats[chat].users;
        let user = chatUsers[realSender]; if (!user) user = chatUsers[realSender] = { coins: 0, inventory: {} };
        let item = args[0]?.toLowerCase();
        let prices = { premium: 10000, coinboost: 5000, robprotect: 3000 };
        if (!prices[item]) return sock.sendMessage(chat, { text: `「✿」 Item no existe. Usa *.shop*` }, { quoted: m });
        if ((user.coins||0) < prices[item]) return sock.sendMessage(chat, { text: `「✿」 No tienes suficientes coins` }, { quoted: m });
        user.coins -= prices[item];
        if (!user.inventory) user.inventory = {};
        user.inventory[item] = (user.inventory[item]||0)+1;
        saveDB(chat, realSender);
        await sock.sendMessage(chat, { text: `「✅」 Compraste *${item}* por ${prices[item]}` }, { quoted: m });
    }
};
// inventory.js
import { UserJid } from '#simple';
export default {
    command: ['inventory', 'inv', 'inventario'],
    description: 'Ver inventario',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, sender }) => {
        const realSender = await UserJid(sock, chat, sender);
        const user = global.db.data.chats[chat].users[realSender];
        if (!user?.inventory) return sock.sendMessage(chat, { text: `「✿」 Inventario vacío` }, { quoted: m });
        let txt = `「🎒」 *INVENTARIO*\n\n` + Object.entries(user.inventory).map(([k,v])=>`• ${k}: ${v}`).join('\n');
        await sock.sendMessage(chat, { text: txt }, { quoted: m });
    }
};
