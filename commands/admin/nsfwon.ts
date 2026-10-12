import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['nsfwon', 'nsfwoff', 'modonsfw'],
    description: 'Activa o desactiva la categoría NSFW en el grupo',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,

    run: async (ctx: any) => {
        const { chat, m, sock, args, usedPrefix, command, prefix } = ctx;
        const p = usedPrefix || prefix || (config as any).prefix || '.';

        const reply = (txt: string) =>
            typeof m?.reply === 'function' ? m.reply(txt) : sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const dbData = (global as any).db?.data;
            if (!dbData) return reply('✿ Error: La base de datos no está inicializada.');

            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};

            const chatDb = dbData.chats[chat];
            const input = args[0]?.toLowerCase()?.trim();

            const enableValues = ['on', '1', 'enable', 'encendido', 'encender', 'activar', 'si', 'sí'];
            const disableValues = ['off', '0', 'disable', 'apagado', 'apagar', 'desactivar', 'no'];

            const estado = chatDb.nsfw ? '✓ Activado' : '✗ Desactivado';

            const menuText =
                `*— MODO NSFW —*\n\n` +
                `✐ Activar » *${p}nsfwon on*\n` +
                `✐ Desactivar » *${p}nsfwon off*\n\n` +
                `✦ Estado actual: *${estado}*\n\n` +
                `> Si está desactivado, ningún comando de la categoría *NSFW 💋* funciona en este grupo.\n` +
                `> Comandos: *${p}nsfw*, *${p}nsfwtiktok*, *${p}girls*, *${p}boobs*, *${p}corean*`;

            if (!input) return reply(menuText);

            if (enableValues.includes(input)) {
                if (chatDb.nsfw) return reply(`「 ꕤ 」 El *modo NSFW* ya estaba activado.`);
                chatDb.nsfw = true;
                saveDB(chat);
                return reply(
                    `💋 *NSFW ACTIVADO*\n` +
                    `> Ya pueden usar la categoría NSFW en este grupo.\n` +
                    `> Comandos: *${p}nsfw*, *${p}nsfwtiktok*, *${p}girls*, *${p}boobs*, *${p}corean*`
                );
            }

            if (disableValues.includes(input)) {
                if (!chatDb.nsfw) return reply(`「 ꕤ 」 El *modo NSFW* ya estaba desactivado.`);
                chatDb.nsfw = false;
                saveDB(chat);
                return reply(`✗ *NSFW DESACTIVADO*\n> La categoría NSFW quedó bloqueada en este grupo.`);
            }

            return reply(menuText);
        } catch (e: any) {
            console.error('Error en nsfwon:', e);
            return reply(`✿ Error al cambiar el modo NSFW\n> ${e?.message || 'Error desconocido'}`);
        }
    }
};
