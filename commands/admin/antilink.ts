import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['antilink', 'antilinks'],
    description: 'Activa o desactiva la protección antienlaces en el grupo',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,

    run: async (ctx) => {
        const { chat, m, args, usedPrefix, command } = ctx;
        const reply = (txt) => m.reply? m.reply(txt) : ctx.sock.sendMessage(chat, { text: txt }, { quoted: m });

        if (!global.db?.data) return reply('✿ Error: DB no inicializada.');
        if (!global.db.data.chats) global.db.data.chats = {};
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {};

        const chatDb = global.db.data.chats[chat];
        const input = args[0]?.toLowerCase();
        const estado = chatDb.antilinks? 'Activado ✓' : 'Desactivado ✗';

        if (!input) {
            return reply(
                `*— ANTILINK PRO —*\n\n` +
                `✐ Activar » *${usedPrefix + command} on*\n` +
                `✐ Desactivar » *${usedPrefix + command} off*\n\n` +
                `✦ Estado: *${estado}*\n` +
                `> El bot eliminará y expulsará a quien mande links.`
            );
        }

        if (['on','1','enable','activar'].includes(input)) {
            chatDb.antilinks = true;
            saveDB();
            return reply(`✓ *Antilink ACTIVADO*\n> Admins que manden link: te salvaste porque eres admin (solo borro)`);
        }

        if (['off','0','disable','desactivar'].includes(input)) {
            chatDb.antilinks = false;
            saveDB();
            return reply(`✗ *Antilink DESACTIVADO*`);
        }
    },

    // DETECTOR TODO EN UNO
    before: async function(m, { sock, isGroup, isAdmin, isBotAdmin }) {
        if (!isGroup) return false;

        const chatDb = global.db?.data?.chats?.[m.chat];
        if (!chatDb?.antilinks) return false;

        const text = (m.text || m.caption || m.body || '').toString().toLowerCase();
        if (!text) return false;

        const isLink = /chat\.whatsapp\.com|wa\.me|https?:\/\/|www\./i.test(text);
        if (!isLink) return false;

        if (!isBotAdmin) return false;

        try {
            await sock.sendMessage(m.chat, { delete: m.key });

            // SI ES ADMIN -> se salva
            if (isAdmin) {
                await sock.sendMessage(m.chat, {
                    text: `😏 *@${m.sender.split('@')[0]} te salvaste porque eres admin*`,
                    mentions: [m.sender]
                });
                return true;
            }

            // SI NO ES ADMIN -> fuera
            await sock.sendMessage(m.chat, {
                text: `*ANTI-LINK* @${m.sender.split('@')[0]} fuera por mandar link`,
                mentions: [m.sender]
            });

            await sock.groupParticipantsUpdate(m.chat, [m.sender], 'remove');
            return true;

        } catch (e) {
            console.log('[ANTILINK] Error:', e);
            return false;
        }
    }
};