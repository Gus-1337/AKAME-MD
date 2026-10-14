import { formatear } from '../../lib/owner-coins.ts';
import { UserJid } from '#simple';
import config from '#config';

const normalizeNumber = (x: string) => {
    if (!x) return '';
    let cleaned = String(x).split('@')[0].split(':').pop() || '';
    cleaned = cleaned.replace(/[^\d]/g, '');
    return cleaned;
};

export default {
    command: ['bal', 'balance', 'coins'],
    description: 'Muestra el balance de un usuario',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, sender }: any) => {
        try {
            const realSender = await UserJid(sock, chat, sender);
            const q = args[0];
            const dbData = (global as any).db?.data;
            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};
            if (!dbData.users) dbData.users = {};
            const chatDb = dbData.chats[chat];
            const chatUsers = chatDb.users || (chatDb.users = {});

            if (chatDb.adminonly) return;

            let mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            let participant = m.message?.extendedTextMessage?.contextInfo?.participant;
            let targetJid: string;
            let targetNumber: string;

            if (mentionedJid) {
                const r = await UserJid(sock, chat, mentionedJid);
                targetJid = r; targetNumber = normalizeNumber(r);
            } else if (participant) {
                const r = await UserJid(sock, chat, participant);
                targetJid = r; targetNumber = normalizeNumber(r);
            } else if (q && !q.startsWith('@')) {
                const clean = q.replace(/[^0-9]/g, '');
                if (clean) { targetJid = clean + '@s.whatsapp.net'; targetNumber = clean; }
                else { targetJid = realSender; targetNumber = normalizeNumber(realSender); }
            } else {
                targetJid = realSender; targetNumber = normalizeNumber(realSender);
            }

            let userInChat = chatUsers[targetJid];
            if (!userInChat) {
                for (const [key, value] of Object.entries(chatUsers)) {
                    if (normalizeNumber(key) === targetNumber) {
                        userInChat = value; targetJid = key; break;
                    }
                }
            }
            if (!userInChat) return await sock.sendMessage(chat, { text: 'ꕤ El usuario no tiene cuenta de economía en este grupo (｡•́︿•̀｡)' }, { quoted: m });

            const coinName = (config as any)?.coin || '¥enes';
            const coins = Number(userInChat.coins) || 0;
            const bank = Number(userInChat.bank) || 0;
            const total = coins + bank;
            const fmt = (n: number) => formatear(n); // ∞ cuando son coins infinitas

            const caption =
`˚₊· ͟͟͞͞➳❥ *BALANCE* ✦
     ❀ Usuario › @${targetJid.split('@')[0]}

 ♡ Efectivo › *${fmt(coins)}* ${coinName}
 ♡ Banco › *${fmt(bank)}* ${coinName}
 ♡ Total › *${fmt(total)}* ${coinName}

_Usa .dep o .with para mover tu dinero_`;

            await sock.sendMessage(chat, { text: caption, mentions: [targetJid] }, { quoted: m });

        } catch (e) {
            console.error('Error en bal:', e);
        }
    }
};
