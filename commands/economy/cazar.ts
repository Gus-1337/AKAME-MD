import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';

const normalizeNumber = (x) => {
    let c = String(x).split('@')[0].split(':').pop() || '';
    return c.replace(/[^\d]/g, '');
};

export default {
    command: ['cazar', 'hunt', 'casa'],
    description: 'Caza animales para ganar coins',
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
        const COOLDOWN = 3 * 60 * 1000;

        if (user.lastCazar && Date.now() - user.lastCazar < COOLDOWN) {
            const r = Math.ceil((COOLDOWN - (Date.now() - user.lastCazar)) / 1000);
            return sock.sendMessage(chat, { text: `「✿」 Debes esperar *${r}s* para volver a cazar` }, { quoted: m });
        }

        const animales = [
            { name: 'Conejo 🐰', coins: 300 },
            { name: 'Zorro 🦊', coins: 600 },
            { name: 'Lobo 🐺', coins: 900 },
            { name: 'Oso 🐻', coins: 1500 },
            { name: 'Jabalí 🐗', coins: 1200 },
            { name: 'Dragón 🐉', coins: 5000 },
        ];
        const animal = animales[Math.floor(Math.random() * animales.length)];
        const reward = animal.coins + Math.floor(Math.random() * 300);

        user.coins = (user.coins || 0) + reward;
        user.lastCazar = Date.now();
        saveDB(chat, realSender);

        await sock.sendMessage(chat, { text: `「🏹」 Cazaste un *${animal.name}* y ganaste *${reward.toLocaleString()} ${coinName}*\n> Balance » *${user.coins.toLocaleString()} ${coinName}*` }, { quoted: m });
    }
};
