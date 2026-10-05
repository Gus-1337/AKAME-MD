import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';
const normalizeNumber = (x) => { let c = String(x).split('@')[0].split(':').pop() || ''; return c.replace(/[^\d]/g, ''); };
export default {
    command: ['slots', 'tragamonedas', 'slot'],
    description: 'Tragamonedas',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, sender, args }) => {
        const realSender = await UserJid(sock, chat, sender);
        const chatUsers = global.db.data.chats[chat].users;
        let user = chatUsers[realSender]; if (!user) user = chatUsers[realSender] = { coins: 0, bank: 0 };
        const coinName = config?.coin || '¥enes';
        let bet = parseInt(args[0]) || 100;
        if ((user.coins||0) < bet) return sock.sendMessage(chat, { text: `「✿」 No tienes ${bet} ${coinName}` }, { quoted: m });
        const emojis = ['🍒','🍋','🍇','💎','7️⃣'];
        let a = emojis[Math.floor(Math.random()*emojis.length)], b = emojis[Math.floor(Math.random()*emojis.length)], c = emojis[Math.floor(Math.random()*emojis.length)];
        let win = 0; if (a===b && b===c) win = bet * 5; else if (a===b || b===c || a===c) win = bet * 2;
        if (win > 0) user.coins += win; else user.coins -= bet;
        saveDB(chat, realSender);
        await sock.sendMessage(chat, { text: `「🎰」 *SLOTS*\n\n[ ${a} | ${b} | ${c} ]\n\n${win > 0? `¡Ganaste ${win} ${coinName}!` : `Perdiste ${bet} ${coinName}`}\n> Balance: ${user.coins.toLocaleString()}` }, { quoted: m });
    }
};
