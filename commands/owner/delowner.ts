import { quitarOwnerExtra } from '../../lib/owners.ts';

// Solo el dueño del bot (owner: true lo valida el handler)
export default {
    command: ['delowner'],
    description: 'Quita un owner agregado con .setowner',
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
                text: `✿ Uso de *${p}delowner*\n> ${p}delowner @usuario — responde o menciona\n> ${p}delowner 51999999999 — por número\n> Solo quita owners agregados con *${p}setowner*.`
            }, { quoted: m });
        }

        const numero = String(quien).split('@')[0].split(':')[0];
        const quitado = quitarOwnerExtra(numero);
        const texto = quitado
            ? `✦ *OWNER QUITADO* ✦\n\n✧ @${numero} ya no es owner del bot.`
            : `✿ @${numero} no está en la lista de owners agregados.`;
        return sock.sendMessage(chat, { text: texto, mentions: [`${numero}@s.whatsapp.net`] }, { quoted: m });
    }
};
