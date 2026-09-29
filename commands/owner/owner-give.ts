import { UserJid } from '#simple';
import { config } from '#config';
import { saveDB } from '#db';

const normalizeNumber = (x: string) => {
    let c = String(x).split('@')[0].split(':').pop() || '';
    return c.replace(/[^\d]/g, '');
};

const isOwner = (jid: string) => {
    const num = normalizeNumber(jid);
    const ownerData = (config as any).owner;
    if (ownerData instanceof Set) {
        for (const o of ownerData) {
            if (normalizeNumber(String(o)) === num) return true;
        }
        return false;
    }
    if (Array.isArray(ownerData)) {
        return ownerData.some((o: any) => normalizeNumber(String(o)) === num);
    }
    return normalizeNumber(String(ownerData)) === num;
};

export default {
    command: ['addmoney', 'givemoney', 'darplata'],
    description: 'Solo owner',
    category: 'owner',
    group: true,
    run: async ({ chat, m, sock, args, sender }: any) => {
        const realSender = await UserJid(sock, chat, sender);
        if (!isOwner(realSender)) {
            return sock.sendMessage(chat, { text: `「✿」 Este comando es solo para mi creador` }, { quoted: m });
        }

        const chatUsers = (global as any).db.data.chats[chat].users;
        let targetJid = realSender;

        // 1. Si respondes a alguien
        const quoted = m.message?.extendedTextMessage?.contextInfo?.participant;
        if (quoted) targetJid = quoted;

        // 2. Si mencionas a alguien
        if (m.mentionedJid && m.mentionedJid.length > 0) {
            targetJid = m.mentionedJid[0];
        }

        let user = chatUsers[targetJid];
        if (!user) {
            const num = normalizeNumber(targetJid);
            for (const [k, v] of Object.entries(chatUsers)) {
                if (normalizeNumber(k) === num) { user = v as any; break; }
            }
        }
        if (!user) user = chatUsers[targetJid] = { coins: 0, bank: 0 };

        // Busca el numero en todos los args (por si pones @usuario 5000 o 5000 @usuario)
        const allArgs = args.join(' ');
        const amount = parseInt(allArgs.replace(/[^0-9]/g, ''));

        if (!amount) {
            return sock.sendMessage(chat, {
                text: `「✿」 Uso:\n>.addmoney 1000000\n>.addmoney 5000 @usuario\n> Responde a alguien:.addmoney 5000`
            }, { quoted: m });
        }

        user.coins = (user.coins || 0) + amount;
        saveDB(chat, targetJid);

        const coinName = (config as any)?.coin || '¥enes';
        const isSelf = normalizeNumber(targetJid) === normalizeNumber(realSender);

        await sock.sendMessage(chat, {
            text: isSelf
               ? `「✿」 Te diste *${amount.toLocaleString()} ${coinName}*\n> Nuevo balance » *${user.coins.toLocaleString()}*`
                : `「✿」 Le diste *${amount.toLocaleString()} ${coinName}* a @${targetJid.split('@')[0]}\n> Nuevo balance » *${user.coins.toLocaleString()}*`,
            mentions: isSelf? [] : [targetJid]
        }, { quoted: m });
    }
};