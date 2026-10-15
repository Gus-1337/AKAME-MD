import { saveDB } from '#db';

// Advertencias antes de expulsar: al llegar a este número, la persona sale del grupo
const MAX_ADVERTENCIAS = 3;

// Links de WhatsApp: grupos y canales
const LINK_WHATSAPP = /(chat\.whatsapp\.com\/[A-Za-z0-9]+|whatsapp\.com\/channel\/[A-Za-z0-9]+)/i;

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

export default {
    command: ['antilink', 'antilinks'],
    description: 'Borra links de grupos y canales de WhatsApp; expulsa tras 3 advertencias',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,

    run: async (ctx) => {
        const { chat, m, args, usedPrefix, command } = ctx;
        const reply = (txt) => m.reply ? m.reply(txt) : ctx.sock.sendMessage(chat, { text: txt }, { quoted: m });

        if (!global.db?.data) return reply('✿ Error: DB no inicializada.');
        if (!global.db.data.chats) global.db.data.chats = {};
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {};

        const chatDb = global.db.data.chats[chat];
        const input = args[0]?.toLowerCase();
        const estado = chatDb.antilinks ? 'Activado ✓' : 'Desactivado ✗';

        if (!input) {
            return reply(caja('ANTILINK', [
                `✧ Activar » *${usedPrefix + command} on*`,
                `✧ Desactivar » *${usedPrefix + command} off*`,
                `✦ Estado » *${estado}*`,
                `✦ Borra links de grupos y canales de WhatsApp.`,
                `✦ ${MAX_ADVERTENCIAS} advertencias y se expulsa.`
            ]));
        }

        if (['on', '1', 'enable', 'activar'].includes(input)) {
            chatDb.antilinks = true;
            saveDB(chat);
            return reply(caja('ANTILINK', ['✓ Activado.', `✦ ${MAX_ADVERTENCIAS} advertencias y se expulsa.`]));
        }

        if (['off', '0', 'disable', 'desactivar'].includes(input)) {
            chatDb.antilinks = false;
            saveDB(chat);
            return reply(caja('ANTILINK', ['✗ Desactivado.']));
        }
    },

    before: async function (ctx: any) {
        const { sock, m, isGroup, isAdmin, isBotAdmin, isOwner } = ctx;
        if (!isGroup) return false;

        const chatDb = global.db?.data?.chats?.[m.chat];
        if (!chatDb?.antilinks) return false;

        const text = (m.text || m.caption || m.body || '').toString();
        if (!text || !LINK_WHATSAPP.test(text)) return false;

        // Sin permisos de admin el bot no puede borrar ni expulsar
        if (!isBotAdmin) return false;

        const quien = m.sender;
        const etiqueta = `@${quien.split('@')[0]}`;

        try {
            await sock.sendMessage(m.chat, { delete: m.key });

            // Admins y dueño: solo se borra el mensaje, sin advertencia
            if (isAdmin || isOwner) return true;

            chatDb.advertencias = chatDb.advertencias || {};
            const total = (chatDb.advertencias[quien] || 0) + 1;

            // Tercera advertencia: se expulsa y se reinicia el contador
            if (total >= MAX_ADVERTENCIAS) {
                delete chatDb.advertencias[quien];
                saveDB(m.chat);
                await sock.sendMessage(m.chat, {
                    text: caja('ANTILINK', [
                        `✧ ${etiqueta} llegó a ${MAX_ADVERTENCIAS}/${MAX_ADVERTENCIAS} advertencias.`,
                        '✦ Sale del grupo por enviar links de WhatsApp.'
                    ]),
                    mentions: [quien]
                });
                await sock.groupParticipantsUpdate(m.chat, [quien], 'remove');
                return true;
            }

            chatDb.advertencias[quien] = total;
            saveDB(m.chat);
            const restantes = MAX_ADVERTENCIAS - total;
            await sock.sendMessage(m.chat, {
                text: caja('ADVERTENCIA', [
                    `✧ ${etiqueta} no envíes links de WhatsApp.`,
                    `✦ Advertencia » *${total}/${MAX_ADVERTENCIAS}*`,
                    `✦ Te quedan ${restantes} ${restantes === 1 ? 'advertencia' : 'advertencias'} antes de salir.`
                ]),
                mentions: [quien]
            });
            return true;
        } catch (e) {
            console.log('[ANTILINK] Error:', e);
            return false;
        }
    }
};
