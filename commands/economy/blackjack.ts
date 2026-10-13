import { UserJid } from '#simple';
import { activeEffectsLine, isBuffActive, softenPenalty } from '#shop';
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
        let reintentada = false;
        if (p > 21 && isBuffActive(user, 'luck')) { p = card()+card(); d = card()+card(); reintentada = true; }
        let res = ''; if (p > 21) { const perdida = softenPenalty(user, bet); res = `Te pasaste con ${p} 💥 Perdiste ${perdida.toLocaleString()}`; user.coins -= perdida; }
        else if (d > 21 || p > d) { res = `Ganaste! Tu: ${p} | Bot: ${d} +${bet}`; user.coins += bet; }
        else if (p < d) { const perdida = softenPenalty(user, bet); res = `Perdiste! Tu: ${p} | Bot: ${d} -${perdida.toLocaleString()}`; user.coins -= perdida; }
        else { res = `Empate! Tu: ${p} | Bot: ${d}`; }
        saveDB(chat, realSender);
        await sock.sendMessage(chat, { text: `「🃏」 *BLACKJACK*\n\n${res}${reintentada? `\n> 🍀 El trébol te salvó y repartió de nuevo` : ''}\nBalance: ${user.coins.toLocaleString()}${activeEffectsLine(user)}` }, { quoted: m });
    }
};
