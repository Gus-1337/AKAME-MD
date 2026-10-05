import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';

const normalizeNumber = (x) => {
    let c = String(x).split('@')[0].split(':').pop() || '';
    return c.replace(/[^\d]/g, '');
};

export default {
    command: ['cofre', 'chest'],
    description: 'Abre un cofre con recompensa',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, sender }) => {
        const realSender = await UserJid(sock, chat, sender);
        const chatUsers = global.db.data.chats[chat].users;
        let user = chatUsers[realSender];
        if (!user) {
            const num = normalizeNumber(realSender);
            for (const [k, v] of Object.entries(chatUsers)) {
                if (normalizeNumber(k) === num) { user = v; break; }
            }
        }
        if (!user) user = chatUsers[realSender] = { coins: 0, bank: 0 };

        const coinName = config?.coin || '¥enes';
        const COOLDOWN = 15 * 60 * 1000; // 15 min

        if (user.lastCofre && Date.now() - user.lastCofre < COOLDOWN) {
            const r = Math.ceil((COOLDOWN - (Date.now() - user.lastCofre)) / 60000);
            return sock.sendMessage(chat, { text: `「✿」 Ya abriste un cofre, espera *${r} min*` }, { quoted: m });
        }

        const rewards = [
            { name: 'Común', coins: Math.floor(Math.random() * 800) + 200 },
            { name: 'Raro', coins: Math.floor(Math.random() * 2000) + 1000 },
            { name: 'Épico', coins: Math.floor(Math.random() * 5000) + 3000 },
            { name: 'Legendario', coins: Math.floor(Math.random() * 10000) + 6000 },
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];

        user.coins = (user.coins || 0) + reward.coins;
        user.lastCofre = Date.now();
        saveDB(chat, realSender);

        await sock.sendMessage(chat, {
            text: `「💰」 *¡COFRE ${reward.name.toUpperCase()}!*\n\nAbriste el cofre y conseguiste *${reward.coins.toLocaleString()} ${coinName}*\n> Balance » *${user.coins.toLocaleString()} ${coinName}*`
        }, { quoted: m });
    }
};
