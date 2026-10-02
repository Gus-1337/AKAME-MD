import fetch from 'node-fetch'
import fs from 'fs'

const memoryFile = './sara_memory.json'

function getMemory() {
    if (!fs.existsSync(memoryFile)) return {}
    try { return JSON.parse(fs.readFileSync(memoryFile, 'utf-8')) }
    catch { return {} }
}
function saveMemory(db) {
    fs.writeFileSync(memoryFile, JSON.stringify(db, null, 2))
}

function isDisabled(chat) {
    try {
        let chatDb = global.db?.data?.chats?.[chat];
        return chatDb?.saraDisabled === true;
    } catch { return false; }
}

export default {
    command: ['sara'],
    description: 'Sara tu amiga',
    category: 'tools',

    before: async (ctx) => {
        const { sock, m, chat, chatDb } = ctx;

        // 🔴 CHECK DIRECTO DE LA DB GLOBAL - FIX REAL
        if (isDisabled(chat) || chatDb?.saraDisabled === true) return false;

        const body = (ctx.body || ctx.text || '').trim();
        if (!body) return false;
        if (m.key?.fromMe) return false;

        const lower = body.toLowerCase();
        const prefix = ctx.prefix || '.';
        if (body.startsWith(prefix)) return false;

        const contextInfo = m?.message?.extendedTextMessage?.contextInfo || {};
        const hasQuoted =!!contextInfo.quotedMessage;
        const isReply = hasQuoted;

        const isMention = lower.includes('sara');
        const dbAuto = global.db?.data?.chats?.[chat]?.saraAuto || chatDb?.saraAuto;
        const isAutoOn = dbAuto === true;

        if (!isAutoOn &&!isMention &&!isReply) return false;

        const pushName = m.pushName || "usuario";
        let promptText = body.replace(/sara/gi, '').trim();
        if (!promptText) promptText = body.trim();
        if (!promptText || promptText.length < 2) return false;

        const sender = m.sender;
        try {
            await sock.sendPresenceUpdate('composing', chat);

            let memoryDB = getMemory();
            if (!memoryDB[sender]) memoryDB[sender] = [];
            memoryDB[sender].push(`Usuario ${pushName}: ${promptText}`);
            if (memoryDB[sender].length > 15) memoryDB[sender] = memoryDB[sender].slice(-15);

            const historial = memoryDB[sender].join('\n');

            let systemPrompt = `Eres Sara, 19 años, chica real de WhatsApp.
Hablas con: ${pushName}. Deduce si es hombre o mujer por el nombre.
Memoria:
${historial}

Reglas: humana 100%, minúsculas, corta 1-2 líneas, no digas bb a hombres que no conoces, no suenes robot, sigue el hilo.`;

            const res = await fetch(`https://api.delirius.online/ia/gptprompt?text=${encodeURIComponent(promptText)}&prompt=${encodeURIComponent(systemPrompt)}`);
            const json = await res.json();
            let respuesta = json.data || "jaja que? 🥺";

            memoryDB[sender].push(`Sara: ${respuesta}`);
            saveMemory(memoryDB);

            await sock.sendPresenceUpdate('paused', chat);
            await sock.sendMessage(chat, { text: respuesta }, { quoted: m });

        } catch {}
        return true;
    },

    run: async (ctx) => {
        const { chat, m } = ctx;
        // 🔴 TAMBIÉN EN EL RUN
        if (isDisabled(chat)) return;
    },
    }
