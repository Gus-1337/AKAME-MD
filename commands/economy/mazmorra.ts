import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';

const normalizeNumber = (x: string) => {
    let c = String(x).split('@')[0].split(':').pop() || '';
    return c.replace(/[^\d]/g, '');
};

export default {
    command: ['mazmorra', 'dungeon'],
    description: 'Mazmorra',
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
        const COOLDOWN = 30 * 60 * 1000;

        if (user.lastMazmorra && Date.now() - user.lastMazmorra < COOLDOWN) {
            const r = COOLDOWN - (Date.now() - user.lastMazmorra);
            const mins = Math.floor(r / 60000);
            const secs = Math.ceil((r % 60000) / 1000);
            return sock.sendMessage(chat, { text: `「✿」 La mazmorra está en descanso\n> Vuelve en *${mins}m ${secs}s*` }, { quoted: m });
        }

        const random = Math.random();
        let amount = 0;
        let msg = '';

        if (random < 0.5) {
            amount = Math.floor(Math.random() * 7000) + 3000;
            msg = `「✿」 Entraste a la mazmorra y conseguiste *${amount.toLocaleString()} ${coinName}*`;
        } else if (random < 0.75) {
            amount = Math.floor(Math.random() * 12000) + 8000;
            msg = `「✿」 Encontraste un cofre con *${amount.toLocaleString()} ${coinName}*\n> Cofre legendario`;
        } else if (random < 0.9) {
            amount = -Math.floor(Math.random() * 3000) - 1000;
            msg = `「✿」 Un monstruo te atacó y perdiste *${Math.abs(amount).toLocaleString()} ${coinName}*`;
        } else {
            msg = `「✿」 No encontraste nada en la mazmorra`;
        }

        user.coins = Math.max(0, (user.coins || 0) + amount);
        user.lastMazmorra = Date.now();
        saveDB(chat, realSender);

        await sock.sendMessage(chat, { text: `${msg}\n> Balance » *${user.coins.toLocaleString()} ${coinName}*` }, { quoted: m });
    }
};