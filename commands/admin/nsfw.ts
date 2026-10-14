import { saveDB } from '#db';
import config from '#config';

const ON = ['on', '1', 'enable', 'encendido', 'encender', 'activar', 'activado', 'si', 'sí', 'true'];
const OFF = ['off', '0', 'disable', 'apagado', 'apagar', 'desactivar', 'desactivado', 'no', 'false'];

export default {
    command: ['nsfw', 'nsfwon', 'nsfwoff', 'modonsfw'],
    description: 'Activa o desactiva la categoría NSFW en el grupo',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,

    run: async (ctx: any) => {
        const { chat, m, sock, args, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || (config as any).prefix || '.';

        const reply = (txt: string) =>
            typeof m?.reply === 'function' ? m.reply(txt) : sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const dbData = (global as any).db?.data;
            if (!dbData) return reply('✿ Error: La base de datos no está inicializada.');

            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};

            const chatDb = dbData.chats[chat];
            // .nsfwon y .nsfwoff son atajos: activan o desactivan sin necesidad de escribir "on"/"off"
            const usado = String(ctx.command || '').toLowerCase().replace(/^[^a-z]+/, '');
            const atajo = usado === 'nsfwon' ? 'on' : usado === 'nsfwoff' ? 'off' : undefined;
            const input = atajo ?? args[0]?.toLowerCase()?.trim();

            const lista =
                `✿ Comandos de la categoría NSFW 💋\n` +
                `> • *${p}nsfwtiktok* — video\n` +
                `> • *${p}girls* — chicas\n` +
                `> • *${p}boobs* — boobs\n` +
                `> • *${p}corean* — coreanas\n` +
                `> • *${p}nsfwrandom* — al azar`;

            const ayuda =
                `*— MODO NSFW —*\n\n` +
                `✐ Activar » *${p}nsfw on*\n` +
                `✐ Desactivar » *${p}nsfw off*\n\n` +
                `✦ Estado actual: *${chatDb.nsfw ? '✓ Activado' : '✗ Desactivado'}*\n\n` +
                `${lista}\n\n` +
                `> Si está desactivado, el bot bloquea todos esos comandos en este grupo.`;

            if (!input) return reply(ayuda);

            if (ON.includes(input)) {
                if (chatDb.nsfw) return reply(`「 ꕤ 」 El *modo NSFW* ya estaba activado.\n\n${lista}`);
                chatDb.nsfw = true;
                saveDB(chat);
                return reply(
                    `💋 *NSFW ACTIVADO*\n` +
                    `> La categoría ya funciona en este grupo.\n\n${lista}`
                );
            }

            if (OFF.includes(input)) {
                if (!chatDb.nsfw) return reply(`「 ꕤ 」 El *modo NSFW* ya estaba desactivado.`);
                chatDb.nsfw = false;
                saveDB(chat);
                return reply(
                    `✗ *NSFW DESACTIVADO*\n` +
                    `> Quedan bloqueados: *${p}nsfwtiktok*, *${p}girls*, *${p}boobs*, *${p}corean*, *${p}nsfwrandom*`
                );
            }

            return reply(ayuda);
        } catch (e: any) {
            console.error('Error en nsfw:', e);
            return reply(`✿ Error al cambiar el modo NSFW\n> ${e?.message || 'Error desconocido'}`);
        }
    }
};
