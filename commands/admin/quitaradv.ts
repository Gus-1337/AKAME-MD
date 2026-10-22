import { saveDB } from '#db';
import { MAX_ADVERTENCIAS, caja, quitarAdvertencias } from '../../lib/antitoxic.ts';

export default {
    command: ['quitaradv', 'quitaradvertencias', 'perdonar'],
    description: 'Quita las advertencias de antitoxic (y el silencio) a una persona',
    category: 'admin',
    group: true,
    admin: true,

    run: async (ctx: any): Promise<any> => {
        const { chat, m, args, usedPrefix, command, sock } = ctx;
        const reply = (txt: string) => m.reply ? m.reply(txt) : sock.sendMessage(chat, { text: txt }, { quoted: m });
        const p = usedPrefix + command;

        if (!global.db?.data) return reply('✿ Error: DB no inicializada.');
        if (!global.db.data.chats) global.db.data.chats = {};
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {};
        const chatDb = global.db.data.chats[chat];

        // Objetivo: mención, respuesta al mensaje o número escrito
        const ctxInfo = m.message?.extendedTextMessage?.contextInfo;
        const numeroEscrito = (args[0] || '').replace(/\D/g, '');
        const objetivo: string | undefined = ctxInfo?.mentionedJid?.[0]
            || ctxInfo?.quotedMessage?.key?.participant
            || ctxInfo?.quotedMessage?.key?.sender
            || (numeroEscrito ? numeroEscrito + '@s.whatsapp.net' : undefined);

        if (!objetivo) {
            return reply(caja('QUITARADV', [
                '✧ Menciona a la persona, responde a su mensaje o escribe su número.',
                `✦ Ejemplo: *${p} @usuario*`
            ]));
        }

        const numero = String(objetivo).split('@')[0].split(':')[0].replace(/\D/g, '');
        const { tenia, estabaSilenciado } = quitarAdvertencias(chatDb, objetivo);
        saveDB(chat);

        if (!tenia && !estabaSilenciado) {
            return sock.sendMessage(chat, { text: caja('QUITARADV', [`✧ @${numero} no tiene advertencias.`]), mentions: [objetivo] }, { quoted: m });
        }

        return sock.sendMessage(chat, {
            text: caja('QUITARADV', [
                `✓ Advertencias de @${numero} quitadas.`,
                tenia ? `✦ Antes » *${tenia}/${MAX_ADVERTENCIAS}*${estabaSilenciado ? ' · silenciado' : ''}` : '✦ Estaba silenciado',
                estabaSilenciado ? '✦ También se quitó el silencio.' : ''
            ].filter(Boolean)),
            mentions: [objetivo]
        }, { quoted: m });
    }
};
