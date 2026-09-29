import { UserJid } from '#simple';
import { saveDB } from '#db';
import { generateWAMessageFromContent, proto } from '@whiskeysockets/baileys';

export default {
    command: ['divorce', 'divorcio'],
    description: 'Divorciate de tu pareja',
    category: 'profile',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, sender }: any) => {
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });
        try {
            const realSender = await UserJid(sock, chat, sender);
            const usersDB = (global as any).db.data.users;
            const user = usersDB[realSender] || {};
            sock.divorce = sock.divorce || {};

            const getName = (jid: string) => usersDB[jid]?.name || sock.getName?.(jid) || jid.split('@')[0];

            const body = (m.text || '').toLowerCase();
            const isConfirm = body.includes('sí, divorciar') || body.includes('confirm') || args[0] === 'confirm';
            const isCancel = body.includes('no, cancelar') || body.includes('cancel') || args[0] === 'cancel';

            if (!user.marry) return reply(`✿ No estás casad@, no puedes divorciarte`);

            const partnerJid = user.marry;
            const partnerUser = usersDB[partnerJid] || {};

            if (isConfirm) {
                const fechaActual = new Date();
                const fechaFin = fechaActual.toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                // --- GUARDAR HISTORY CON DURACIÓN ---
                const calcDuracion = (inicioStr: string) => {
                    try {
                        // Tu inicio viene como "13 sept 2025, 10:30 p.m." no lo parsea new Date bien, asi que buscamos la fecha original
                        const inicio = new Date(inicioStr);
                        if (isNaN(inicio.getTime())) return null;
                        const diff = Math.abs(fechaActual.getTime() - inicio.getTime());
                        const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
                        if (dias === 0) return `menos de un día`;
                        if (dias === 1) return `1 día`;
                        return `${dias} días`;
                    } catch { return null; }
                };

                if (user.marryHistory && user.marryHistory.length > 0) {
                    // agarra el último que esté en presente
                    for (let i = user.marryHistory.length - 1; i >= 0; i--) {
                        const h = user.marryHistory[i];
                        if (h.partner === partnerJid && h.fin === 'presente') {
                            h.fin = fechaFin;
                            const dur = calcDuracion(h.inicio);
                            if (dur) h.duracion = dur;
                            break;
                        }
                    }
                }

                if (partnerUser.marryHistory && partnerUser.marryHistory.length > 0) {
                    for (let i = partnerUser.marryHistory.length - 1; i >= 0; i--) {
                        const h = partnerUser.marryHistory[i];
                        if (h.partner === realSender && h.fin === 'presente') {
                            h.fin = fechaFin;
                            const dur = calcDuracion(h.inicio);
                            if (dur) h.duracion = dur;
                            break;
                        }
                    }
                }

                user.marry = null;
                if (partnerUser) partnerUser.marry = null;
                saveDB(chat, realSender);
                saveDB(chat, partnerJid);
                if (sock.divorce[realSender]) delete sock.divorce[realSender];

                return await sock.sendMessage(chat, {
                    text: `✩.･:｡≻───── ⋆💔⋆ ─────.•:｡✩\n\n*¡Se han divorciado!* 💔\n\n*${getName(realSender)}* y *${getName(partnerJid)}* han terminado su matrimonio...\n\n> _A veces el amor no es para siempre_\n> _Que encuentren su camino por separado_ 🕊️\n\n✩.･:｡≻───── ⋆💔⋆ ─────.•:｡✩`,
                    mentions: [realSender, partnerJid]
                }, { quoted: m });
            }

            if (isCancel) {
                if (sock.divorce[realSender]) delete sock.divorce[realSender];
                return reply(`💖 *${getName(realSender)}* decidió no divorciarse, ¡que viva el amor!`);
            }

            // Pedir confirmación con botones
            sock.divorce[realSender] = partnerJid;

            const buttons = [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "💔 Sí, divorciar",
                        id: `${usedPrefix}divorce confirm`
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "💖 No, cancelar",
                        id: `${usedPrefix}divorce cancel`
                    })
                }
            ];

            const textoDivorce = `💔 *DIVORCIO* 💔\n\n@${realSender.split('@')[0]}, ¿estás segur@ que quieres divorciarte de @${partnerJid.split('@')[0]}?\n\n> Esta acción romperá su matrimonio para siempre...\n> _¿Aún así quieres continuar?_`;

            const msg = generateWAMessageFromContent(chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: proto.Message.InteractiveMessage.create({
                            body: proto.Message.InteractiveMessage.Body.create({ text: textoDivorce }),
                            footer: proto.Message.InteractiveMessage.Footer.create({ text: "AKAME-MD 💖" }),
                            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
                            nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({ buttons })
                        })
                    }
                }
            }, { quoted: m });

            msg.message.viewOnceMessage.message.interactiveMessage.contextInfo = { mentionedJid: [realSender, partnerJid] };

            await sock.relayMessage(chat, msg.message, { messageId: msg.key.id });

            setTimeout(() => { if (sock.divorce[realSender]) delete sock.divorce[realSender]; }, 300000);

        } catch (e) {
            console.error('Error en divorce:', e);
            return reply(`✿ Ocurrió un error`);
        }
    }
};