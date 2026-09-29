import { UserJid } from '#simple';
import config from '#config';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

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
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';
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
            } else if (q &&!q.startsWith('@')) {
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
            if (!userInChat) return await sock.sendMessage(chat, { text: '「 ꕤ 」 El usuario no tiene cuenta de economía en este grupo.' }, { quoted: m });

            const coinName = (config as any)?.coin || '¥enes';
            const coins = userInChat.coins || 0;
            const bank = userInChat.bank || 0;
            const total = coins + bank;
            const fmt = (n: number) => `${n.toLocaleString()} ${coinName}`;

            const caption = `✩.･:｡≻───── ⋆💰⋆ ─────.•:｡✩\n\n✿ *Economía de @${targetJid.split('@')[0]}* ✿\n\n⛀ Efectivo » *${fmt(coins)}*\n⚿ Banco » *${fmt(bank)}*\n⛁ Total » *${fmt(total)}*\n\n✩.･:｡≻───── ⋆💰⋆ ─────.•:｡✩`;

            const buttons = [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({ display_text: "💼 Trabajar", id: `${p}work` })
                }
            ];

            const msg = generateWAMessageFromContent(chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({ text: caption }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: "AKAME-MD ECONOMY 💖" }),
                            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons })
                        })
                    }
                }
            }, { quoted: m });

            msg.message.viewOnceMessage.message.interactiveMessage.contextInfo = { mentionedJid: [targetJid] };
            await sock.relayMessage(chat, msg.message, { messageId: msg.key.id });

        } catch (e) {
            console.error('Error en bal:', e);
        }
    }
};