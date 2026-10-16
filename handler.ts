import { serialize, UserJid } from '#simple';
import { registerData, saveDB } from '#db';
import config from '#config';
import chalk from 'chalk';
import { broadcast } from '#index';
import { LRUCache } from 'lru-cache';
import { obtenerPrimario } from '#primario';
import { estaActiva } from './lib/ajustes.ts';

// Comandos de gacha (waifus y Pokémon): se apagan con `.gacha off`.
const COMANDOS_GACHA = ['harem', 'mywaifus', 'misswaifus', 'reclamar', 'claim', 'c', 'venderpk', 'liberarpk', 'soltarpk', 'pokemon', 'pk', 'rp', 'pokemones', 'pokes', 'mispokemon', 'waifu', 'waifus', 'rw', 'cpk', 'atrapar', 'reclamarpk'];

const handlerConfig = (config as any)?.handler || {};
const metaTtlMs = handlerConfig.metaTtl || 300000;
const msgTtlMs = handlerConfig.msgTtl || 10000;
const maxGroupCache = handlerConfig.maxGroupCache || 500;
const maxProcessedMsgs = handlerConfig.maxProcessedMsgs || 2000;
const rateLimitWindowMs = handlerConfig.rateLimitWindow || 3000;
const maxCmdsPerWin = handlerConfig.maxCommandsPerWindow || 5;

const groupMetaCache = new LRUCache<string, { metadata: any; ts: number }>({
    max: maxGroupCache,
    ttl: metaTtlMs,
});
/**
 * El Set de admins de cada grupo, cacheado.
 * getAdminSet recorre todos los participantes y normaliza 3 campos por admin, y eso
 * corría en CADA mensaje; en un grupo de 250 personas es trabajo repetido por gusto
 * porque la metadata ya está cacheada 5 minutos. Se recalcula cuando cambia la
 * referencia de la lista de participantes o cuando se invalida la metadata.
 */
const groupAdminSetCache = new LRUCache<string, { parts: any[]; set: Set<string> }>({
    max: maxGroupCache,
    ttl: metaTtlMs,
});

function getAdminSetCached(chat: string, participants: any[]): Set<string> {
    const hit = groupAdminSetCache.get(chat);
    if (hit && hit.parts === participants) return hit.set;
    const set = getAdminSet(participants);
    groupAdminSetCache.set(chat, { parts: participants, set });
    return set;
}
const processedMsgIds = new LRUCache<string, boolean>({
    max: maxProcessedMsgs,
    ttl: msgTtlMs,
});
const userRateLimits = new Map<string, { count: number; resetTime: number }>();
const commandMap = new Map<string, any>();
/**
 * Solo los plugins que tienen hook `before`. Antes se recorrían los ~200 plugins
 * completos en cada mensaje para descubrir que apenas 6 tienen el hook.
 */
let beforePlugins: any[] = [];
const adminOnlyWarned = new Map<string, Set<string>>();
let lastPluginsRef: any = null;

export function invalidateGroupCache(chatId: string): void {
    if (chatId) {
        groupMetaCache.delete(chatId);
        groupAdminSetCache.delete(chatId);
    }
}

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of userRateLimits.entries()) {
        if (now > value.resetTime) userRateLimits.delete(key);
    }
    for (const [chat, users] of adminOnlyWarned.entries()) {
        const chatDb = (global as any).db?.data?.chats?.[chat];
        if (!chatDb?.adminonly) adminOnlyWarned.delete(chat);
    }
}, 60000);

const normalizeNumber = (x: string) => String(x || "").split("@")[0].split(":")[0].replace(/[^\d]/g, "").trim();
const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const stripMexOne = (num: string) => num.startsWith('521')? '52' + num.slice(3) : num;

function getAdminSet(participants: any[]): Set<string> {
    const adminSet = new Set<string>();
    if (!participants ||!participants.length) return adminSet;
    for (let i = 0; i < participants.length; i++) {
        const p = participants[i];
        if (p.admin === 'admin' || p.admin === 'superadmin') {
            if (p.id) {
                const clean = normalizeNumber(p.id);
                adminSet.add(clean); adminSet.add(stripMexOne(clean)); adminSet.add(p.id);
            }
            if (p.lid) {
                const clean = normalizeNumber(p.lid);
                adminSet.add(clean); adminSet.add(stripMexOne(clean)); adminSet.add(p.lid);
            }
            if (p.phoneNumber) {
                const clean = normalizeNumber(p.phoneNumber);
                adminSet.add(clean); adminSet.add(p.phoneNumber);
            }
        }
    }
    return adminSet;
}

// ¿El texto es un comando de la categoría subbot (.code, .reactivar, ...)?
// Esos sí se atienden en privado; el resto de comandos solo en grupos.
function esComandoSubbot(texto: string): boolean {
    syncCommandMapIfNeeded();
    const rawGlobal: any = (global as any).db?.data?.settings?.globalPrefix ?? (config as any)?.prefix ?? '.';
    const prefijos: string[] = (Array.isArray(rawGlobal) ? rawGlobal : [rawGlobal])
        .filter((p: any) => typeof p === 'string' && p.length > 0);
    const prefijo = prefijos.find((p) => texto.startsWith(p));
    if (!prefijo) return false;
    const nombre = texto.slice(prefijo.length).trim().split(/\s+/)[0]?.toLowerCase() || '';
    return commandMap.get(nombre)?.category === 'subbot';
}

function syncCommandMapIfNeeded(): void {
    const currentPlugins = (global as any).plugins;
    if (currentPlugins === lastPluginsRef) return;
    lastPluginsRef = currentPlugins;
    commandMap.clear();
    beforePlugins = [];
    if (currentPlugins && typeof currentPlugins === 'object') {
        const entries = Object.values(currentPlugins);
        for (let i = 0; i < entries.length; i++) {
            const plugin: any = entries[i];
            if (typeof plugin?.before === 'function') beforePlugins.push(plugin);
            if (!plugin?.command) continue;
            if (plugin.eval || plugin.exec || plugin.require || plugin.fs) continue;
            const execFn = plugin.run || plugin.default || (typeof plugin === 'function'? plugin : null);
            if (!execFn) continue;
            plugin._exec = execFn;
            const cmd = plugin.command;
            if (Array.isArray(cmd)) {
                for (let j = 0; j < cmd.length; j++) {
                    const cmdStr = String(cmd[j]).toLowerCase().trim();
                    commandMap.set(cmdStr, plugin);
                    commandMap.set(normalizeString(cmdStr), plugin);
                }
            } else {
                const cmdStr = String(cmd).toLowerCase().trim();
                commandMap.set(cmdStr, plugin);
                commandMap.set(normalizeString(cmdStr), plugin);
            }
        }
    }
}

async function getGroupMetadata(sock: any, chatId: string): Promise<any> {
    const cached = groupMetaCache.get(chatId);
    if (cached?.metadata) return cached.metadata;
    try {
        const freshMeta = await sock.groupMetadata(chatId);
        if (freshMeta) {
            groupMetaCache.set(chatId, { metadata: freshMeta, ts: Date.now() });
            return freshMeta;
        }
    } catch {}
    return null;
}

function checkRateLimit(sender: string): boolean {
    const now = Date.now();
    let record = userRateLimits.get(sender);
    if (!record || now > record.resetTime) {
        userRateLimits.set(sender, { count: 1, resetTime: now + rateLimitWindowMs });
        return false;
    }
    record.count++;
    return record.count > maxCmdsPerWin;
}

function logHandlerError(e: any): void {
    if (e?.message?.includes('rate-overlimit') || e?.status === 429) return;
    if (!e?.message?.includes('jidDecode')) {
        console.error(chalk.red('[HANDLER ERROR]:'), e);
        queueMicrotask(() => {
            broadcast('handler_error', { error: e?.message || 'Unknown error', stack: e?.stack });
        });
    }
}

function extractNativeText(rawMsg: any): string {
    const m = rawMsg?.message;
    if (!m) return '';
    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.imageMessage?.caption) return m.imageMessage.caption;
    if (m.videoMessage?.caption) return m.videoMessage.caption;
    if (m.templateButtonReplyMessage?.selectedId) return m.templateButtonReplyMessage.selectedId;
    if (m.buttonsResponseMessage?.selectedButtonId) return m.buttonsResponseMessage.selectedButtonId;
    if (m.listResponseMessage?.singleSelectReply?.selectedRowId) return m.listResponseMessage.singleSelectReply.selectedRowId;
    if (m.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
        try {
            const params = JSON.parse(m.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
            return params.id || params.selectedRowId || params.display_text || '';
        } catch { return ''; }
    }
    return '';
}

export const handler = async (sock: any, rawMsg: any): Promise<any> => {
    const startTime = Date.now();
    const msgId = rawMsg?.key?.id;
    if (msgId) {
        if (processedMsgIds.has(msgId)) return;
        processedMsgIds.set(msgId, true);
    }
    const chat = rawMsg?.key?.remoteJid;
    if (!chat) return;
    const isGroup = chat.endsWith('@g.us');
    const groupMetadata = isGroup? await getGroupMetadata(sock, chat) : null;
    const rawParticipant = rawMsg?.key?.participant || rawMsg?.participant || (rawMsg?.key?.fromMe? sock.user?.id : chat) || '';
    const msgSender = rawMsg?.sender || '';
    let realJidResult = rawParticipant;
    try { realJidResult = UserJid(sock, chat, realJidResult) || realJidResult; } catch {}
    const normalizedSender = normalizeNumber(realJidResult);
    const normalizedMsgSender = normalizeNumber(msgSender);
    // Los mensajes del propio bot no se procesan.
    // Subbots: el dueño escribe desde su propia cuenta; esos mensajes sí se atienden.
    // Las respuestas que envía el propio subbot se filtran en index.ts.
    if (rawMsg?.key?.fromMe && !(global as any).esSubbot) return;
    // El límite de comandos se aplica más abajo, solo cuando el mensaje ES un comando.
    // Estaba acá y contaba TODOS los mensajes: en un grupo con conversación el 6º
    // mensaje en 3 s se descartaba en silencio y no llegaba ni a los hooks `before`
    // (los filtros antilink/antispam) ni a nada.
    const altSender = normalizedSender.startsWith('521')? normalizedSender.replace(/^521/, '52') : (normalizedSender.startsWith('52')? normalizedSender.replace(/^52/, '521') : normalizedSender);
    const baseSender = stripMexOne(normalizedSender);
    const ownerConfig = (config as any)?.owner;
    let isOwner = false;
    if (ownerConfig instanceof Set) {
        isOwner = ownerConfig.has(normalizedSender) || ownerConfig.has(altSender) || ownerConfig.has(baseSender);
    } else if (Array.isArray(ownerConfig)) {
        isOwner = ownerConfig.some((num: string) => {
            const cleanNum = normalizeNumber(num);
            return normalizedSender === cleanNum || altSender === cleanNum || baseSender === stripMexOne(cleanNum);
        });
    } else if (typeof ownerConfig === 'string' || typeof ownerConfig === 'number') {
        const cleanNum = normalizeNumber(String(ownerConfig));
        isOwner = normalizedSender === cleanNum || altSender === cleanNum || baseSender === stripMexOne(cleanNum);
    }
    let isAdmins = false;
    let isBotAdmins = false;
    if (isGroup && groupMetadata?.participants) {
        const adminSet = getAdminSetCached(chat, groupMetadata.participants);
        isAdmins = adminSet.has(normalizedSender) || adminSet.has(normalizedMsgSender) || adminSet.has(altSender) || adminSet.has(baseSender) || adminSet.has(rawParticipant) || adminSet.has(msgSender);
        const rawBotJid = sock.user?.id || sock.user?.jid || '';
        const botBase = normalizeNumber(rawBotJid);
        const altBot = botBase.startsWith('521')? botBase.replace(/^521/, '52') : (botBase.startsWith('52')? botBase.replace(/^52/, '521') : botBase);
        // El bot también puede aparecer en el grupo por su @lid (sobre todo en subbots): se revisa ese ID tambien
        const rawBotLid = (sock.user as any)?.lid || '';
        const botLid = normalizeNumber(rawBotLid);
        isBotAdmins = adminSet.has(botBase) || adminSet.has(altBot) || adminSet.has(stripMexOne(botBase)) || adminSet.has(rawBotJid)
            || (!!botLid && (adminSet.has(botLid) || adminSet.has(stripMexOne(botLid)))) || (!!rawBotLid && adminSet.has(rawBotLid));
    }
    const dbData = (global as any).db?.data;
    const currentChatDb = dbData?.chats?.[chat] || {};
    if (isGroup && chat && Array.isArray(currentChatDb.muteds)) {
        const isMuted = currentChatDb.muteds.some((m: string) => {
            const cleanMuted = normalizeNumber(m);
            return cleanMuted === normalizedSender || cleanMuted === altSender || cleanMuted === baseSender || m === realJidResult;
        });
        if (isMuted &&!isOwner) {
            if (isBotAdmins && rawMsg?.key) sock.sendMessage(chat, { delete: rawMsg.key }).catch(() => null);
            return;
        }
    }
    const msg = serialize(sock, rawMsg);
    if (!msg) return;
    msg.isGroup = isGroup;
    msg.isAdmin = isAdmins;
    msg.isBotAdmin = isBotAdmins;
    msg.isOwner = isOwner;
    msg.groupMetadata = groupMetadata;

    const nativeText = extractNativeText(rawMsg);
    if (nativeText) {
        msg.body = nativeText;
        msg.text = nativeText;
    }

    // Solo se atiende lo que llega en grupos. En privado únicamente los comandos de subbots.
    if (!isGroup && !esComandoSubbot(String(msg.body || msg.text || '').trim())) return;

    try {
        syncCommandMapIfNeeded();
        const textForBefore = msg.body || msg.text || '';
        for (const plug of beforePlugins) {
            {
                try {
                    const beforeCtx = {
               ...msg, sock, m: msg, msg, chat,
                        sender: msg.sender || realJidResult,
                        text: textForBefore, body: textForBefore,
                        db: (global as any).db,
                    };
                    const res = await plug.before(beforeCtx);
                    if (beforeCtx.body && beforeCtx.body!== textForBefore) {
                        msg.body = beforeCtx.body
                        msg.text = beforeCtx.text || beforeCtx.body
                    }
                    if (beforeCtx.m?.text && beforeCtx.m.text!== textForBefore) {
                        msg.body = beforeCtx.m.text
                        msg.text = beforeCtx.m.text
                    }
                    if (res) return;
                } catch (e) {}
            }
        }
    } catch {}

    const rawGlobal = (global as any).db?.data?.settings?.globalPrefix?? (config as any)?.prefix?? '.';
    const prefijoArray: string[] = Array.isArray(rawGlobal)? rawGlobal.map(String) : [String(rawGlobal)];
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixRegex = new RegExp('^(' + prefijoArray.map(p => escapeRegex(p)).join('|') + ')', 'i');
    let rawBody = (msg.body || msg.text || '').trim();
    const match = prefixRegex.exec(rawBody);
    if (!match) return;
    const matchedPrefix = match[0];
    const isCommand =!!matchedPrefix;
    const prefix = prefijoArray[0] || '.';

    // Acá iba un chequeo inline de antilinks. Era código muerto: estaba DESPUÉS del
    // `if (!match) return;` de arriba, así que solo se alcanzaba con mensajes que ya
    // traían prefijo, y su condición pedía `!isCommand` (o sea, sin prefijo). No se
    // ejecutó nunca y duplicaba el linkify.find de cada mensaje. El antilink real es
    // el hook `before` de commands/admin/antilink.ts.
    if (!isCommand ||!msg.body) return;
    // Límite anti-abuso: solo aplica a comandos (5 por ventana de 3 s).
    if (checkRateLimit(normalizedSender)) return;
    const bodyWithoutPrefix = msg.body.slice(matchedPrefix.length).trim();
    if (!bodyWithoutPrefix) return;
    const spaceIndex = bodyWithoutPrefix.indexOf(' ');
    const rawCommand = spaceIndex === -1? bodyWithoutPrefix : bodyWithoutPrefix.slice(0, spaceIndex);
    if (!rawCommand) return;
    syncCommandMapIfNeeded();
    const cmd = commandMap.get(rawCommand.toLowerCase()) || commandMap.get(normalizeString(rawCommand));

    // Bot primario del grupo: si hay uno asignado con .setprimary, solo ese bot responde comandos ahí.
    // .setprimary siempre pasa, para poder cambiarlo o quitarlo.
    const esSetPrimary = Array.isArray(cmd?.command) ? cmd.command.includes('setprimary') : cmd?.command === 'setprimary';
    if (isGroup && !esSetPrimary) {
        const primario = obtenerPrimario(chat);
        if (primario && primario !== normalizeNumber(sock.user?.id || '')) return;
    }

    // --- MENSAJE PERSONALIZADO CON REACT ---
    if (!cmd) {
        await sock.sendMessage(chat, { react: { text: '🥺', key: rawMsg.key } }).catch(()=>null);
        const txt = `₍ᐢ..ᐢ₎ El comando *${rawCommand}* no existe, para ver los comandos usa:\n> *${matchedPrefix}menu*`;
        await sock.sendMessage(chat, { text: txt }, { quoted: rawMsg }).catch(()=>null);
        return;
    }

    // Subbots: sin comandos de dueño del bot ni de la categoría subbot (no crean subbots en subbots)
    if ((global as any).esSubbot && (cmd.owner || cmd.category === 'subbot')) return;
    if (cmd.owner &&!isOwner) {
        queueMicrotask(() => { broadcast('security_event', { type: 'unauthorized_access', command: rawCommand, sender: normalizedSender, chat }); });
        return msg.reply('ׅ ׄ ✿ Este comando solo puede ser utilizado por el dueño del bot.');
    }
    if (cmd.group &&!isGroup) return msg.reply('ׅ ׄ ✿ Este comando solo se puede usar en grupos.');
    const onlyAdminEnabled = currentChatDb.adminonly === true;
    if (onlyAdminEnabled &&!isAdmins &&!isOwner) {
        if (!adminOnlyWarned.has(chat)) adminOnlyWarned.set(chat, new Set());
        const warnedUsers = adminOnlyWarned.get(chat)!;
        if (!warnedUsers.has(normalizedSender)) {
            warnedUsers.add(normalizedSender);
            return msg.reply('ׅ ׄ ✿ El modo *Solo Admin* está activado, solo administradores pueden usar comandos.');
        }
        return;
    }
    if (cmd.admin &&!isAdmins &&!isOwner) {
        queueMicrotask(() => { broadcast('security_event', { type: 'unauthorized_admin_command', command: rawCommand, sender: normalizedSender, chat }); });
        return msg.reply('ׅ ׄ ✿ Necesitas ser administrador del grupo para usar este comando.');
    }
    if (cmd.botAdmin &&!isBotAdmins) return msg.reply('ׅ ׄ ✿ El bot necesita ser administrador del grupo para ejecutar este comando.');
    if (cmd.nsfw) {
        const nsfwOn = currentChatDb?.nsfw === true;
        if (isGroup &&!nsfwOn &&!isOwner) {
            queueMicrotask(() => { broadcast('security_event', { type: 'nsfw_blocked', command: rawCommand, sender: normalizedSender, chat }); });
            return msg.reply(
                'ׅ ׄ ✿ La categoría *NSFW 💋* está desactivada en este grupo.\n' +
                '> Un administrador puede activarla con *' + (matchedPrefix?? prefix) + 'nsfw on*'
            );
        }
    }
    if (isGroup &&!isOwner && currentChatDb) {
        const nombres: string[] = Array.isArray(cmd.command) ? cmd.command : [cmd.command];
        const esEconomia = cmd.category === 'economy' && !estaActiva(currentChatDb, 'economia');
        const esGacha = nombres.some((n) => COMANDOS_GACHA.includes(n)) && !estaActiva(currentChatDb, 'gacha');
        if (esEconomia || esGacha) {
            const quien = esEconomia ? 'economia' : 'gacha';
            return msg.reply(
                '✿ Esta función está desactivada en este grupo.\n' +
                '> Un admin puede activarla con *' + (matchedPrefix ?? prefix) + quien + ' on*'
            );
        }
    }
    const cleanSender = normalizedSender + '@s.whatsapp.net';
    const rawArgs = spaceIndex === -1? [] : bodyWithoutPrefix.slice(spaceIndex + 1).trim().split(/ +/);
    const args = rawArgs.map(arg => arg.replace(/[&;|$`]/g, ''));
    const ctx = {
...msg, sock, m: msg, msg, args, command: rawCommand, prefix, usedPrefix: matchedPrefix?? prefix,
        owner: isOwner, admin: isAdmins, botAdmin: isBotAdmins, isAdmin: isAdmins, isBotAdmin: isBotAdmins, isOwner,
        chat, groupMetadata, db: (global as any).db, user: dbData?.users?.[cleanSender] || {}, chatDb: currentChatDb,
        edit: (text: string, key: any) => { if (!key) return Promise.resolve(null); return sock.sendMessage(chat, { text, edit: key }); }
    };
    if (cmd._exec) {
        queueMicrotask(() => {
            broadcast('command_received', { msgId, command: rawCommand, chat, sender: msg.sender, isGroup, timestamp: startTime });
            registerData(sock, msg).catch(() => {});
        });
        if (dbData) {
            queueMicrotask(() => {
                if (!dbData.users) dbData.users = {};
                if (!dbData.users[cleanSender]) dbData.users[cleanSender] = {};
                const userDb = dbData.users[cleanSender];
                userDb.usedcommands = (userDb.usedcommands || 0) + 1;
                userDb.exp = (userDb.exp || 0) + Math.floor(Math.random() * 10) + 5;
                if (isGroup && dbData.chats?.[chat]?.users?.[cleanSender]) dbData.chats[chat].users[cleanSender].lastCmd = Date.now();
                saveDB(chat, cleanSender);
                broadcast('db_updated', { chat, user: cleanSender, exp: userDb.exp, usedcommands: userDb.usedcommands });
            });
        }
        queueMicrotask(() => { broadcast('command_executing', { command: rawCommand, chat, sender: cleanSender }); });
        try {
            const result = await cmd._exec(ctx);
            queueMicrotask(() => { broadcast('command_executed', { command: rawCommand, chat, sender: cleanSender, executionTimeMs: Date.now() - startTime }); });
            return result;
        } catch (e: any) { logHandlerError(e); }
    }
};
