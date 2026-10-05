import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';

const normalizeNumber = (x) => {
    let c = String(x).split('@')[0].split(':').pop() || '';
    return c.replace(/[^\d]/g, '');
};

export default {
    command: ['rob', 'robar'],
    description: 'Roba coins a otro usuario',
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
        const COOLDOWN = 10 * 60 * 1000;

        if (user.lastRob && Date.now() - user.lastRob < COOLDOWN) {
            const r = Math.ceil((COOLDOWN - (Date.now() - user.lastRob)) / 60000);
            return sock.sendMessage(chat, { text: `「✿」 Espera *${r} min* para volver a robar` }, { quoted: m });
        }

        let who = m.mentionedJid?.[0] || m.quoted?.sender;
        if (!who) return sock.sendMessage(chat, { text: `「✿」 Etiqueta a alguien para robar\nEj: *robar @usuario*` }, { quoted: m });

        const targetJid = await UserJid(sock, chat, who);
        let target = chatUsers[targetJid];
        if (!target || (target.coins || 0) < 500) return sock.sendMessage(chat, { text: `「✿」 Ese usuario no tiene suficientes *${coinName}* para robar (mínimo 500)` }, { quoted: m });
        if (targetJid === realSender) return sock.sendMessage(chat, { text: `「✿」 No te puedes robar a ti mismo` }, { quoted: m });

        let success = Math.random() > 0.4; // 60% de exito
        if (success) {
            let amount = Math.floor((target.coins || 0) * 0.25);
            user.coins += amount;
            target.coins -= amount;
            user.lastRob = Date.now();
            saveDB(chat, realSender);
            saveDB(chat, targetJid);
            await sock.sendMessage(chat, { text: `「🔪」 Le robaste *${amount.toLocaleString()} ${coinName}* a @${targetJid.split('@')[0]}`, mentions: [targetJid] }, { quoted: m });
        } else {
            let multa = Math.floor((user.coins || 0) * 0.1);
            user.coins = Math.max(0, (user.coins || 0) - multa);
            user.lastRob = Date.now();
            saveDB(chat, realSender);
            await sock.sendMessage(chat, { text: `「😹」 Te atraparon intentando robar y te multaron con *${multa.toLocaleString()} ${coinName}*` }, { quoted: m });
        }
    }
};
