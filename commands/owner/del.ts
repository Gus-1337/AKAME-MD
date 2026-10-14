export default {
    command: ['del', 'borrar', 'delmsg'],
    description: 'Borra el mensaje al que respondes (solo owner)',
    category: 'owner',
    owner: true,
    run: async ({ chat, m, sock, msg }: any) => {
        const ctxInfo = msg?.message?.extendedTextMessage?.contextInfo
            || msg?.message?.imageMessage?.contextInfo
            || msg?.message?.videoMessage?.contextInfo
            || msg?.message?.stickerMessage?.contextInfo
            || {};

        const stanzaId = ctxInfo.stanzaId;
        const participant = ctxInfo.participant;

        if (!stanzaId) {
            return sock.sendMessage(chat, {
                text: '✿ Responde al mensaje que quieres borrar con *.del*'
            }, { quoted: m });
        }

        const key = {
            remoteJid: chat,
            fromMe: false,
            id: stanzaId,
            participant
        };

        try {
            await sock.sendMessage(chat, { delete: key });
            // Borra también el comando .del para que no quede rastro
            await sock.sendMessage(chat, { delete: m.key }).catch(() => null);
        } catch (e: any) {
            return sock.sendMessage(chat, {
                text: `✿ No pude borrar el mensaje\n> ${e?.message || 'Revisa que el bot sea admin del grupo'}`
            }, { quoted: m });
        }
    }
};
