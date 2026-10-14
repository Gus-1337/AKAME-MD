export default {
    command: ['del', 'borrar', 'delmsg'],
    description: 'Borra el mensaje de otra persona al que respondes (solo owner)',
    category: 'owner',
    owner: true,
    run: async ({ chat, m, sock, msg, botAdmin }: any) => {
        const ctxInfo = msg?.message?.extendedTextMessage?.contextInfo
            || msg?.message?.imageMessage?.contextInfo
            || msg?.message?.videoMessage?.contextInfo
            || msg?.message?.stickerMessage?.contextInfo
            || {};

        const stanzaId = ctxInfo.stanzaId || m.quoted?.key?.id;
        const participant = ctxInfo.participant || m.quoted?.key?.participant || m.quoted?.sender;

        if (!stanzaId) {
            return sock.sendMessage(chat, {
                text: '✿ Responde al mensaje de la persona que quieres borrar con *.del*'
            }, { quoted: m });
        }

        const esGrupo = String(chat).endsWith('@g.us');
        if (esGrupo && !botAdmin) {
            return sock.sendMessage(chat, {
                text: '✿ El bot necesita ser *admin* del grupo para borrar mensajes de otras personas'
            }, { quoted: m });
        }

        try {
            // Solo se borra el mensaje citado. El comando .del se queda en el chat.
            await sock.sendMessage(chat, {
                delete: { remoteJid: chat, fromMe: false, id: stanzaId, participant }
            });
        } catch (e: any) {
            return sock.sendMessage(chat, {
                text: `✿ No pude borrar el mensaje\n> ${e?.message || 'Revisa que el bot sea admin del grupo'}`
            }, { quoted: m });
        }
    }
};
