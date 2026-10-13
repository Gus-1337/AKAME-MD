import { saveDB } from '#db';

/**
 * Saca el contextInfo de un mensaje crudo, sea cual sea el tipo de contenido
 * (texto, imagen, video, sticker, audio, documento, contacto...).
 */
const getContextInfo = (raw: any): any => {
    const message = raw?.message;
    if (!message) return null;
    for (const type of Object.keys(message)) {
        const part = message[type];
        if (part && typeof part === 'object' && part.contextInfo) return part.contextInfo;
    }
    return message?.messageContextInfo || null;
};

/**
 * Detecta un estado compartido en el grupo.
 *
 * El proto de WhatsApp NO tiene una marca que diga "esto es un estado":
 * ContextInfo solo expone `isForwarded` (campo 22) y `forwardingScore` (campo 21).
 * Compartir un estado llega como un reenvío, así que esa es la señal disponible.
 * Un reenvío cualquiera también la cumple — de ahí el subcomando `forward`.
 */
const getStatusForward = (ctxInfo: any, estricto: boolean): boolean => {
    if (!ctxInfo) return false;
    const score = Number(ctxInfo.forwardingScore || 0);
    if (ctxInfo.isForwarded === true && score >= 1) return true;
    return !estricto && score >= 1;
};

const ensureChat = (chat: string) => {
    if (!(global as any).db?.data) return null;
    if (!(global as any).db.data.chats) (global as any).db.data.chats = {};
    if (!(global as any).db.data.chats[chat]) (global as any).db.data.chats[chat] = {};
    const c = (global as any).db.data.chats[chat];
    c.antiestados ??= false;
    c.antiestadosTodo ??= false;
    return c;
};

export default {
    command: ['antiestados', 'antistatus', 'antistados'],
    description: 'Borra estados compartidos en el grupo',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,

    run: async (ctx: any) => {
        const { chat, m, args, usedPrefix, prefix, command } = ctx;
        const p = usedPrefix || prefix || '.';
        const reply = (txt: string) =>
            m?.reply ? m.reply(txt) : ctx.sock.sendMessage(chat, { text: txt }, { quoted: m });

        const chatDb = ensureChat(chat);
        if (!chatDb) return reply('✿ Error: DB no inicializada.');

        const input = args[0]?.toLowerCase();
        const estado = chatDb.antiestados ? 'Activado ✓' : 'Desactivado ✗';
        const alcance = chatDb.antiestadosTodo
            ? 'todo reenvío (incluye estados)'
            : 'solo lo marcado como reenvío por WhatsApp';

        if (!input) {
            return reply(
                `*— ANTIESTADOS —*\n\n` +
                `✐ Activar » *${p}${command} on*\n` +
                `✐ Desactivar » *${p}${command} off*\n` +
                `✐ Solo estados » *${p}${command} solo*\n` +
                `✐ Todo reenvío » *${p}${command} forward*\n\n` +
                `✦ Estado: *${estado}*\n` +
                `✦ Alcance: *${alcance}*\n\n` +
                `> WhatsApp no marca los estados compartidos, los marca como reenvío.\n` +
                `> Con *on* borro lo que WhatsApp marca como reenvío; con *forward* borro además lo reenviado varias veces.`
            );
        }

        if (['on', '1', 'enable', 'activar'].includes(input)) {
            chatDb.antiestados = true;
            saveDB(chat);
            return reply(`✓ *Antiestados ACTIVADO*\n> Alcance: ${alcance}`);
        }

        if (['off', '0', 'disable', 'desactivar'].includes(input)) {
            chatDb.antiestados = false;
            saveDB(chat);
            return reply('✗ *Antiestados DESACTIVADO*');
        }

        if (['solo', 'status', 'estado', 'estados', 'strict', 'estricto'].includes(input)) {
            chatDb.antiestados = true;
            chatDb.antiestadosTodo = false;
            saveDB(chat);
            return reply('✓ *Antiestados ACTIVADO*\n> Alcance: solo lo que WhatsApp marca como reenvío');
        }

        if (['forward', 'todo', 'all', 'reenvios'].includes(input)) {
            chatDb.antiestados = true;
            chatDb.antiestadosTodo = true;
            saveDB(chat);
            return reply('✓ *Antiestados ACTIVADO*\n> Alcance: todo reenvío, incluido lo reenviado varias veces');
        }

        return reply(`✿ Opción no reconocida: *${input}*\n> Usa *${p}${command}* para ver las opciones.`);
    },

    before: async (ctx: any) => {
        const { sock, m, chat, isGroup, isAdmin, isBotAdmin, isOwner } = ctx;
        if (!isGroup) return false;

        const chatDb = (global as any).db?.data?.chats?.[chat];
        if (!chatDb?.antiestados) return false;
        if (!isBotAdmin) return false;
        if (!m?.key || m.key.fromMe) return false;

        if (!getStatusForward(getContextInfo(m), !chatDb.antiestadosTodo)) return false;

        try {
            await sock.sendMessage(chat, { delete: m.key });

            if (isOwner || isAdmin) {
                await sock.sendMessage(chat, {
                    text: `😏 @${String(m.sender).split('@')[0]} te salvaste porque eres admin (solo lo borré)`,
                    mentions: [m.sender]
                });
                return true;
            }

            await sock.sendMessage(chat, {
                text: `*ANTIESTADOS* ✂️ @${String(m.sender).split('@')[0]} acá no se comparten estados`,
                mentions: [m.sender]
            });
            return true;
        } catch (e) {
            console.log('[ANTIESTADOS] Error:', e);
            return false;
        }
    }
};
