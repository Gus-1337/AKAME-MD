import { saveDB } from '#db';

// Estado por usuario y grupo: mensajes recientes y avisos dados.
const spamState: Record<string, { times: number[]; strikes: number; lastStrike: number }> = {};

const DEFAULT_CFG = { max: 6, seconds: 5, warns: 2 };
const STRIKE_RESET_MS = 10 * 60 * 1000;

/** "5/60/2" o "5/1m/2": mensajes / tiempo / avisos antes de eliminar. */
const parsearConfig = (texto: string) => {
    const partes = texto.replace(/\s+/g, '').split('/');
    if (partes.length !== 3) return null;

    const max = Number(partes[0]);
    const warns = Number(partes[2]);

    const tiempo = partes[1].toLowerCase();
    const esMinutos = tiempo.endsWith('m');
    const seconds = Number(esMinutos ? tiempo.slice(0, -1) : tiempo) * (esMinutos ? 60 : 1);

    if (!Number.isInteger(max) || max < 2 || max > 50) return null;
    if (!Number.isInteger(warns) || warns < 1 || warns > 5) return null;
    if (!Number.isFinite(seconds) || seconds < 2 || seconds > 3600) return null;

    return { max, seconds, warns };
};

const formatoTiempo = (s: number) => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : `${s} s`);

export default {
    command: ['antispam'],
    description: 'Activa antispam con límites que elige el admin',
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
        const p = usedPrefix + command;
        const cfg = chatDb.antiSpamCfg || DEFAULT_CFG;
        const estado = chatDb.antiSpam ? 'Activado ✓' : 'Desactivado ✗';
        const input = (args || []).join('').trim().toLowerCase();

        if (!input) {
            return reply(
                `*— ANTISPAM —*\n\n` +
                `✐ Activar » *${p} on*\n` +
                `✐ Personalizar » *${p} 5/60/2*\n` +
                `   ✧ 5 mensajes\n` +
                `   ✧ en 60 segundos (o *1m* = 1 minuto)\n` +
                `   ✧ 2 avisos antes de eliminar\n` +
                `✐ Desactivar » *${p} off*\n\n` +
                `✦ Estado: *${estado}*\n` +
                `✦ Actual: *${cfg.max}* mensajes en *${formatoTiempo(cfg.seconds)}*, *${cfg.warns}* avisos`
            );
        }

        if (['off', '0', 'disable', 'desactivar'].includes(input)) {
            chatDb.antiSpam = false;
            saveDB(chat);
            return reply(`✗ *AntiSpam DESACTIVADO*`);
        }

        if (['on', '1', 'enable', 'activar'].includes(input)) {
            chatDb.antiSpam = true;
            chatDb.antiSpamCfg = chatDb.antiSpamCfg || { ...DEFAULT_CFG };
            saveDB(chat);
            return reply(
                `✓ *AntiSpam ACTIVADO*\n\n` +
                `✦ *${chatDb.antiSpamCfg.max}* mensajes en *${formatoTiempo(chatDb.antiSpamCfg.seconds)}*, *${chatDb.antiSpamCfg.warns}* avisos antes de eliminar`
            );
        }

        const nueva = parsearConfig(input);
        if (!nueva) {
            return reply(
                `✿ Formato incorrecto.\n` +
                `✿ Usa: *${p} mensajes/tiempo/avisos*\n` +
                `✿ Ejemplo: *${p} 5/60/2* o *${p} 5/1m/2*\n\n` +
                `> mensajes: 2 a 50 · tiempo: 2 s a 60 min · avisos: 1 a 5`
            );
        }

        chatDb.antiSpam = true;
        chatDb.antiSpamCfg = nueva;
        saveDB(chat);
        return reply(
            `✓ *AntiSpam ACTIVADO*\n\n` +
            `✦ *${nueva.max}* mensajes en *${formatoTiempo(nueva.seconds)}*\n` +
            `✦ *${nueva.warns}* avisos y a la siguiente se elimina`
        );
    },

    before: async (ctx) => {
        const { sock, m, chat, isGroup, isAdmin, isBotAdmin, sender, isOwner } = ctx;
        if (!isGroup) return false;
        if (isOwner || isAdmin) return false;
        if (!isBotAdmin) return false;

        const chatDb = global.db?.data?.chats?.[chat];
        if (!chatDb?.antiSpam) return false;

        const cfg = chatDb.antiSpamCfg || DEFAULT_CFG;
        const now = Date.now();
        const key = `${chat}|${sender}`;
        const st = spamState[key] || (spamState[key] = { times: [], strikes: 0, lastStrike: 0 });

        // Sólo cuentan los mensajes dentro de la ventana elegida.
        const windowMs = cfg.seconds * 1000;
        st.times = st.times.filter((t) => now - t <= windowMs);
        st.times.push(now);

        if (st.strikes && now - st.lastStrike > STRIKE_RESET_MS) st.strikes = 0;
        if (st.times.length < cfg.max) return false;

        // Llegó al límite: cuenta como una infracción y se reinicia la ventana.
        st.times = [];
        st.strikes++;
        st.lastStrike = now;
        const tag = `@${sender.split('@')[0]}`;

        if (st.strikes <= cfg.warns) {
            await sock.sendMessage(chat, {
                text: `⚠️ ${tag} no hagas spam (${st.strikes}/${cfg.warns + 1})`,
                mentions: [sender]
            }, { quoted: m });
            return false;
        }

        await sock.sendMessage(chat, {
            text: `👺 ${tag} eliminado por spam`,
            mentions: [sender]
        }, { quoted: m });
        await sock.groupParticipantsUpdate(chat, [sender], 'remove').catch(() => {});
        delete spamState[key];
        return true;
    }
};
