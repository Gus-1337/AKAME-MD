import { UserJid } from '#simple';
import { activeEffectsLine, isBuffActive } from '#shop';
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
        const giro = () => emojis[Math.floor(Math.random()*emojis.length)];
        const premio = (x: string, y: string, z: string) => (x===y && y===z)? bet * 5 : ((x===y || y===z || x===z)? bet * 2 : 0);
        let a = giro(), b = giro(), c = giro();
        let win = premio(a, b, c);
        let reintentada = false;
        if (win === 0 && isBuffActive(user, 'luck')) {
            a = giro(); b = giro(); c = giro();
            win = premio(a, b, c);
            reintentada = true;
        }
        if (win > 0) user.coins += win; else user.coins -= bet;
        saveDB(chat, realSender);
        await sock.sendMessage(chat, { text: `「🎰」 *SLOTS*\n\n[ ${a} | ${b} | ${c} ]\n\n${win > 0? `¡Ganaste ${win} ${coinName}!` : `Perdiste ${bet} ${coinName}`}${reintentada && win > 0? `\n> 🍀 El trébol te dio una tirada extra` : ''}${activeEffectsLine(user)}` }, { quoted: m });
    }
};
