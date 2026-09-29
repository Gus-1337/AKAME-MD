import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';

const normalizeNumber = (x: string) => {
    let c = String(x).split('@')[0].split(':').pop() || '';
    return c.replace(/[^\d]/g, '');
};

export default {
    command: ['mine', 'minar', 'mina'],
    description: 'Minar',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, sender }: any) => {
        const realSender = await UserJid(sock, chat, sender);
        const chatUsers = (global as any).db.data.chats[chat].users;
        let user = chatUsers[realSender];
        if (!user) {
            const num = normalizeNumber(realSender);
            for (const [k, v] of Object.entries(chatUsers)) {
                if (normalizeNumber(k) === num) { user = v as any; break; }
            }
        }
        if (!user) user = chatUsers[realSender] = { coins: 0, bank: 0 };

        const coinName = (config as any)?.coin || '¥enes';
        const COOLDOWN = 2 * 60 * 1000;

        if (user.lastMine && Date.now() - user.lastMine < COOLDOWN) {
            const r = Math.ceil((COOLDOWN - (Date.now() - user.lastMine)) / 1000);
            return sock.sendMessage(chat, { text: `「✿」 Debes esperar *${r}s* para volver a minar` }, { quoted: m });
        }

        const reward = Math.floor(Math.random() * 2000) + 500;
        user.coins = (user.coins || 0) + reward;
        user.lastMine = Date.now();
        saveDB(chat, realSender);

        await sock.sendMessage(chat, { text: `「✿」 Minaste y conseguiste *${reward.toLocaleString()} ${coinName}*\n> Balance » *${user.coins.toLocaleString()} ${coinName}*` }, { quoted: m });
    }
};