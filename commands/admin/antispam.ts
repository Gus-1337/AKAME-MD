import { saveDB } from '#db';

const userSpamData = {}

export default {
    command: ['antispam'],
    description: 'Activa antispam',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,

    run: async (ctx) => {
        const { chat, m, args, usedPrefix, command, sock } = ctx;
        const reply = (txt) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        if (!global.db?.data?.chats) global.db.data.chats = {};
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {};

        const chatDb = global.db.data.chats[chat];
        const input = args[0]?.toLowerCase();
        const estado = chatDb.antiSpam? 'Activado ✓' : 'Desactivado ✗';

        if (!input) {
            return reply(
                `*— ANTISPAM —*\n\n` +
                `✐ Activar » *${usedPrefix + command} on*\n` +
                `✐ Desactivar » *${usedPrefix + command} off*\n\n` +
                `✦ Estado: *${estado}*`
            );
        }

        if (['on','1','enable','activar'].includes(input)) {
            chatDb.antiSpam = true;
            saveDB();
            return reply(`✓ *AntiSpam ACTIVADO*`);
        }

        if (['off','0','disable','desactivar'].includes(input)) {
            chatDb.antiSpam = false;
            saveDB();
            return reply(`✗ *AntiSpam DESACTIVADO*`);
        }
    },

    before: async (ctx) => {
        const { sock, m, chat, isGroup, isAdmin, isBotAdmin, sender, isOwner } = ctx
        if (!isGroup) return false
        if (isOwner || isAdmin) return false
        if (!isBotAdmin) return false

        const chatDb = global.db?.data?.chats?.[chat]
        if (!chatDb?.antiSpam) return false

        const currentTime = Date.now()
        const timeWindow = 5000
        const messageLimit = 6

        if (!(sender in userSpamData)) {
            userSpamData[sender] = { lastMessageTime: currentTime, messageCount: 1, antiBan: 0 }
            return false
        }

        const userData = userSpamData[sender]
        const diff = currentTime - userData.lastMessageTime

        if (diff <= timeWindow) {
            userData.messageCount++
            if (userData.messageCount >= messageLimit) {
                userData.messageCount = 1
                userData.antiBan++

                if (userData.antiBan === 1) {
                    await sock.sendMessage(chat, { text: `⚠️ @${sender.split('@')[0]} no hagas spam (1/3)`, mentions: [sender] }, { quoted: m })
                    setTimeout(() => userData.antiBan = 0, 30000)
                } else if (userData.antiBan === 2) {
                    await sock.sendMessage(chat, { text: `🚩 @${sender.split('@')[0]} spam (2/3)`, mentions: [sender] }, { quoted: m })
                    setTimeout(() => userData.antiBan = 0, 60000)
                } else {
                    await sock.sendMessage(chat, { text: `👺 @${sender.split('@')[0]} eliminado por spam`, mentions: [sender] }, { quoted: m })
                    await sock.groupParticipantsUpdate(chat, [sender], 'remove').catch(()=>{})
                    delete userSpamData[sender]
                    return true
                }
            }
        } else {
            if (diff > 2000) userData.messageCount = 1
        }

        userData.lastMessageTime = currentTime
        return false
    }
};
