import { UserJid } from '#simple';
import { saveDB } from '#db';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

export default {
    command: ['marry', 'casar'],
    description: 'Cásate con otro usuario',
    category: 'profile',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });
        try {
            const realSender = await UserJid(sock, chat, sender);
            const usersDB = (global as any).db.data.users;
            const user = usersDB[realSender] || {};
            sock.marry = sock.marry || {};

            const getName = (jid: string) => usersDB[jid]?.name || sock.getName?.(jid) || jid.split('@')[0];
            const getGenre = (jid: string) => (usersDB[jid]?.genre || '').toLowerCase();

            const body = (m.text || '').toLowerCase();
            const isAccept = body.includes('sí, acepto') || body.includes('accept_marry') || args[0] === 'accept';
            const isReject = body.includes('no, rechazo') || body.includes('reject_marry') || args[0] === 'reject' || args[0] === 'no';

            if (isAccept) {
                let proposerId = null;
                for (const [from, to] of Object.entries(sock.marry as any)) {
                    if (to === realSender) { proposerId = from; break; }
                }
                if (!proposerId) return reply(`✿ No tienes propuestas pendientes`);

                const targetUser = usersDB[proposerId] || {};
                const fecha = new Date().toLocaleString('es-ES');
                const fechaStr = new Date().toLocaleDateString('es-ES');
                if (!user.marryHistory) user.marryHistory = [];
                if (!targetUser.marryHistory) targetUser.marryHistory = [];
                user.marryHistory.push({ partner: proposerId, inicio: fecha, fin: 'presente', fecha: fechaStr });
                targetUser.marryHistory.push({ partner: realSender, inicio: fecha, fin: 'presente', fecha: fechaStr });
                user.marry = proposerId;
                targetUser.marry = realSender;
                saveDB(chat, realSender);
                saveDB(chat, proposerId);
                delete sock.marry[proposerId];

                return await sock.sendMessage(chat, {
                    text: `✩.･:｡≻───── ⋆♡⋆ ─────.•:｡✩\n\n💍 *¡Se han casado!* 💍\n\nHoy unimos en matrimonio a *${getName(proposerId)}* y *${getName(realSender)}* 💖\n\n> _Que sean felices hasta que la muerte los separe_ 🕊️✨\n> _Disfruten su luna de miel_\n\n✩.･:｡≻───── ⋆♡⋆ ─────.•:｡✩`,
                    mentions: [proposerId, realSender]
                }, { quoted: m });
            }

            if (isReject) {
                let proposerId = null;
                for (const [from, to] of Object.entries(sock.marry as any)) {
                    if (to === realSender) { proposerId = from; break; }
                }
                if (proposerId) delete sock.marry[proposerId];
                return reply(`💔 *${getName(realSender)}* dijo que no...`);
            }

            if (user.marry) return reply(`✿ Ya estás casad@ con *${getName(user.marry)}*`);

            let mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            let quotedSender = m.message?.extendedTextMessage?.contextInfo?.participant;
            let targetJid: string;
            if (mentionedJid) targetJid = await UserJid(sock, chat, mentionedJid);
            else if (quotedSender) targetJid = await UserJid(sock, chat, quotedSender);
            else if (args[0]) {
                const clean = args[0].replace(/[^0-9]/g, '');
                if (clean) targetJid = clean + '@s.whatsapp.net';
            }
            if (!targetJid) return reply(`✿ Menciona a alguien\nEj: *${usedPrefix}marry @usuario*`);
            if (targetJid === realSender) return reply(`✰ No puedes casarte contigo mism@`);
            if (usersDB[targetJid]?.marry) return reply(`✿ *${getName(targetJid)}* ya está casad@`);

            if (sock.marry[targetJid] === realSender) {
                // Por si lo acepta escribiendo.marry @usuario
                const targetUser = usersDB[targetJid] || {};
                const fecha = new Date().toLocaleString('es-ES');
                const fechaStr = new Date().toLocaleDateString('es-ES');
                if (!user.marryHistory) user.marryHistory = [];
                if (!targetUser.marryHistory) targetUser.marryHistory = [];
                user.marryHistory.push({ partner: targetJid, inicio: fecha, fin: 'presente', fecha: fechaStr });
                targetUser.marryHistory.push({ partner: realSender, inicio: fecha, fin: 'presente', fecha: fechaStr });
                user.marry = targetJid;
                targetUser.marry = realSender;
                saveDB(chat, realSender);
                saveDB(chat, targetJid);
                delete sock.marry[targetJid];
                return await sock.sendMessage(chat, {
                    text: `💍 *¡Se han casado!* 💍\n\nHoy unimos en matrimonio a *${getName(targetJid)}* y *${getName(realSender)}*\n\n> _Que sean felices hasta que la muerte los separe_ 🕊️✨`,
                    mentions: [targetJid, realSender]
                }, { quoted: m });
            }

            sock.marry[realSender] = targetJid;

            // Definir si es esposa/esposo según género
            let rol = 'espos@';
            const genre = getGenre(realSender);
            if (genre === 'hombre' || genre === 'masculino') rol = 'esposo';
            else if (genre === 'mujer' || genre === 'femenino') rol = 'esposa';
            else if (genre === 'otro') rol = 'espose';

            const buttons = [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "💍 Sí, acepto",
                        id: `${usedPrefix}marry accept`
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "💔 No, rechazo",
                        id: `${usedPrefix}marry reject`
                    })
                }
            ];

            const textoPropuesta = `💒 *MATRIMONIO* 💒\n\n@${targetJid.split('@')[0]}, @${realSender.split('@')[0]} te propone matrimonio 💖\n\n¿Aceptas a @${realSender.split('@')[0]} como tu ${rol}?\n\n> Responde con los botones`;

            const msg = generateWAMessageFromContent(chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({ text: textoPropuesta }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: "AKAME-MD 💖" }),
                            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons })
                        })
                    }
                }
            }, { quoted: m, userJid: chat });

            // para que taggee bien
            msg.message.viewOnceMessage.message.interactiveMessage.body.text = textoPropuesta;
            msg.message.viewOnceMessage.message.interactiveMessage.contextInfo = { mentionedJid: [targetJid, realSender] };

            await sock.relayMessage(chat, msg.message, { messageId: msg.key.id });

            setTimeout(() => { if (sock.marry[realSender]) delete sock.marry[realSender]; }, 1800000);

        } catch (e) {
            console.error('Error en marry:', e);
            return reply(`✿ Ocurrió un error`);
        }
    }
};