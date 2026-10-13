import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';
const normalizeNumber = (x) => { let c = String(x).split('@')[0].split(':').pop() || ''; return c.replace(/[^\d]/g, ''); };
export default {
    command: ['blackjack', 'bj', '21'],
    description: 'Juega blackjack',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, sender, args }) => {
        const realSender = await UserJid(sock, chat, sender);
        const chatUsers = global.db.data.chats[chat].users;
        let user = chatUsers[realSender]; if (!user) user = chatUsers[realSender] = { coins: 0, bank: 0 };
        const coinName = config?.coin || '¥enes';
        let bet = parseInt(args[0]); if (!bet || bet <= 0) return sock.sendMessage(chat, { text: `「✿」 Usa: *.blackjack <cantidad>*` }, { quoted: m });
        if ((user.coins || 0) < bet) return sock.sendMessage(chat, { text: `「✿」 No tienes suficientes ${coinName}` }, { quoted: m });
        const card = () => Math.floor(Math.random()*11)+1;
        let p = card()+card(); let d = card()+card();
        let res = ''; if (p > 21) { res = `Te pasaste con ${p} 💥 Perdiste ${bet}`; user.coins -= bet; }
        else if (d > 21 || p > d) { res = `Ganaste! Tu: ${p} | Bot: ${d} +${bet}`; user.coins += bet; }
        else if (p < d) { res = `Perdiste! Tu: ${p} | Bot: ${d} -${bet}`; user.coins -= bet; }
        else { res = `Empate! Tu: ${p} | Bot: ${d}`; }
        saveDB(chat, realSender);
        await sock.sendMessage(chat, { text: `「🃏」 *BLACKJACK*\n\n${res}\nBalance: ${user.coins.toLocaleString()}` }, { quoted: m });
    }
};
