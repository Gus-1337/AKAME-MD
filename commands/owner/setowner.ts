import { agregarOwnerExtra } from '../../lib/owners.ts';

// Solo el dueño del bot (owner: true lo valida el handler)
export default {
    command: ['setowner'],
    description: 'Agrega un owner al bot',
    category: 'owner',
    owner: true,

    run: async ({ chat, m, sock, args, usedPrefix }: any) => {
        const p = usedPrefix || '.';
        const quien =
            m?.message?.extendedTextMessage?.contextInfo?.participant ||
            m?.mentionedJid?.[0] ||
            (args.join(' ').replace(/\D/g, '') || '');

        if (!quien) {
            return sock.sendMessage(chat, {
                text: `✿ Uso de *${p}setowner*\n> ${p}setowner @usuario — responde o menciona\n> ${p}setowner 51999999999 — por número`
            }, { quoted: m });
        }

        const numero = String(quien).split('@')[0].split(':')[0];
        const nuevo = agregarOwnerExtra(numero);
        const texto = nuevo
            ? `✦ *OWNER AGREGADO* ✦\n\n✧ @${numero} ahora es owner del bot.`
            : `✿ @${numero} ya era owner del bot.`;
        return sock.sendMessage(chat, { text: texto, mentions: [`${numero}@s.whatsapp.net`] }, { quoted: m });
    }
};
