import axios from 'axios';
import { generarTarjetaBienvenida } from './tarjeta-bienvenida.ts';
import { UserJid } from '#simple';
import config from '#config';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getRandomIcon = (): string => {
    const icons = ['ꕤ', '✰', '❀'];
    return icons[Math.floor(Math.random() * icons.length)];
};

const parseJidString = (p: any): string => {
    if (!p) return '';
    if (typeof p === 'string') return p;
    if (typeof p === 'object' && p.id) return String(p.id);
    if (typeof p === 'object' && p.jid) return String(p.jid);
    return String(p);
};

const buildLocationQuoted = (groupName: string) => ({
    key: {
        participant: '0@s.whatsapp.net',
        remoteJid: 'status@broadcast',
        fromMe: false,
        id: 'Halo'
    },
    message: {
        locationMessage: {
            degreesLatitude: 37.7749,
            degreesLongitude: -122.4194,
            name: `${groupName}`,
            address: `${groupName}`,
            url: 'https://maps.google.com'
        }
    },
    participant: '0@s.whatsapp.net',
    status: 1
});

export const handleGroupAlerts = async (sock: any, updates: any[]) => {
    for (const group of updates) {
        const chatJid = parseJidString(group.id);
        if (!chatJid) continue;

        if (!global.db?.data?.chats?.[chatJid]) {
            if (!global.db.data.chats) global.db.data.chats = {};
            global.db.data.chats[chatJid] = {};
        }
        const chat = global.db.data.chats[chatJid];
        if (!chat.alerts) continue;

        const rawAuthor = parseJidString(group.author);
        const cleanSenderJid = rawAuthor? UserJid(sock, chatJid, rawAuthor) : '';
        const phone = cleanSenderJid? cleanSenderJid.split('@')[0] : '';

        let texto = '';
        const icon = getRandomIcon();

        if (group.subject) {
            texto = `${icon} @${phone} cambió el nombre del grupo a *${group.subject}*`;
        } else if (group.announce!== undefined) {
            texto = `${icon} @${phone} cambió los ajustes del grupo para permitir que ${group.announce? 'solo los administradores puedan enviar mensajes.' : 'todos los miembros puedan enviar mensajes.'}`;
        } else if (group.restrict!== undefined) {
            texto = `${icon} @${phone} cambió los ajustes del grupo para permitir que ${group.restrict? 'solo admins' : 'todos'} puedan configurar el grupo.`;
        } else if (group.revoke) {
            texto = `${icon} @${phone} restableció el enlace del grupo.`;
        } else if (group.icon) {
            texto = `${icon} @${phone} cambió el icono del grupo.`;
        }

        if (texto) {
            const groupMetadata = await sock.groupMetadata(chatJid).catch(() => null);
            const groupName = groupMetadata?.subject || config?.botName || 'Grupo';
            const mentions = cleanSenderJid? [cleanSenderJid] : [];
            await sock.sendMessage(chatJid, { text: texto, mentions }, { quoted: buildLocationQuoted(groupName) }).catch(() => null);
        }
    }
};

/** Nombre de la persona: el que tiene guardado el bot (pushName). Si no lo conoce, no muestra el número. */
const nombreDe = (jid: string): string => {
    const guardado = (global as any).db?.data?.users?.[String(jid || '').split('@')[0] + '@s.whatsapp.net']?.name;
    return guardado && guardado !== 'Usuario' ? String(guardado).slice(0, 30) : 'Nuevo miembro';
};

export const handleGroupParticipants = async (sock: any, part: any) => {
    const groupEventConfig = {
        imageTimeout: 2000,
        maxMentions: 50,
        defaultMessages: {
            welcome: 'Bienvenido al mejor grupo 🥳\n> ✰ Configura con: *.setwelcome*',
            goodbye: 'Se fue uno, ni modo 😿'
        }
    };

    if (!part?.participants?.length) return;
    const chatJid = parseJidString(part.id);
    const action = part.action;
    const rawAuthor = parseJidString(part.author);

    if (!global.db?.data?.chats?.[chatJid]) {
        if (!global.db.data.chats) global.db.data.chats = {};
        global.db.data.chats[chatJid] = {};
    }
    const chat = global.db.data.chats[chatJid];

    if (chat.alerts && ['promote', 'demote'].includes(action)) {
        const firstParticipant = parseJidString(part.participants[0]);
        const rawSender = rawAuthor || firstParticipant;
        const cleanSenderJid = rawSender? UserJid(sock, chatJid, rawSender) : '';

        const groupMetadata = await sock.groupMetadata(chatJid).catch(() => null);
        const groupName = groupMetadata?.subject || config?.botName || 'Grupo';
        const groupMembers = groupMetadata?.participants?.map((p: any) => UserJid(sock, chatJid, p.id)).filter(Boolean) || [];

        for (const p of part.participants) {
            const cleanP = parseJidString(p);
            if (!cleanP) continue;

            const cleanTargetJid = UserJid(sock, chatJid, cleanP);
            const phone = cleanTargetJid.split('@')[0];
            const actor = cleanSenderJid.split('@')[0];
            const icon = getRandomIcon();

            let texto = '';
            if (action === 'promote') {
                texto = `${icon} *@${phone}* ha sido promovido a Administrador por *@${actor}.*`;
            } else if (action === 'demote') {
                texto = `${icon} *@${phone}* ha sido degradado de Administrador por *@${actor}.*`;
            }

            if (texto) {
                const mentions = Array.from(new Set([...groupMembers, cleanTargetJid, cleanSenderJid])).filter(Boolean);
                await sock.sendMessage(chatJid, { text: texto, mentions: mentions }, { quoted: buildLocationQuoted(groupName) }).catch(() => null);
            }
        }
    }

    if (!['add', 'remove'].includes(action)) return;

    try {
        await delay(Math.floor(Math.random() * (3000 - 1500 + 1) + 1500));
        chat.welcome??= false;
        chat.bye??= false;

        if (action === 'add' &&!chat.welcome) return;
        if (action === 'remove' &&!chat.bye) return;

        const rawMentions = part.participants
           .map((p: any) => parseJidString(p))
           .filter(Boolean)
           .slice(0, groupEventConfig.maxMentions);

        if (rawMentions.length === 0) return;

        const mentions = rawMentions.map((m: string) => UserJid(sock, chatJid, m));

        const [metadata, profilePics, groupProfilePic] = await Promise.all([
            sock.groupMetadata(chatJid).catch(() => null),
            Promise.all(mentions.slice(0, 5).map(async (jid: string) => {
                try {
                    return await Promise.race([
                        sock.profilePictureUrl(jid, 'image'),
                        new Promise<string>((_, reject) =>
                            setTimeout(() => reject(new Error('timeout')), groupEventConfig.imageTimeout)
                        )
                    ]);
                } catch {
                    return null;
                }
            })),
            sock.profilePictureUrl(chatJid, 'image').catch(() => null)
        ]);

        if (!metadata) return;

        const groupName = metadata.subject || 'Grupo';
        const desc = metadata.desc? metadata.desc.toString() : 'Sin descripción';
        const totalMembers = metadata.participants?.length || 0;

        let sWelcome = (chat.sWelcome && chat.sWelcome.trim().length > 0)? chat.sWelcome : groupEventConfig.defaultMessages.welcome;
        let sGoodbye = (chat.sGoodbye && chat.sGoodbye.trim().length > 0)? chat.sGoodbye : groupEventConfig.defaultMessages.goodbye;

        const userTags = mentions.map((m: string) => `@${m.split('@')[0]}`).join(', ');
        const rawText = action === 'add'? sWelcome : sGoodbye;

        let finalMsg = rawText
           .replace(/{user}|@user|#user/g, userTags)
           .replace(/{grupo}|@grupo|#grupo/g, groupName)
           .replace(/{desc}|@desc|#desc/g, desc);

        // --- DISEÑO CON DATOS DEL GRUPO ---
        const ahora = new Date();
        const fecha = ahora.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });
        const hora = ahora.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false });
        const descCorta = desc.replace(/\s+/g, ' ').trim().slice(0, 90) + (desc.length > 90 ? '…' : '');
        const nombres = mentions.slice(0, 3).map((m: string) => nombreDe(m)).join(', ') + (mentions.length > 3 ? ` y ${mentions.length - 3} más` : '');
        const cabecera = action === 'add' ? '◜ ✿ 𝗪𝗘𝗟𝗖𝗢𝗠𝗘 ✿ ◞' : '◜ ✿ 𝗚𝗢𝗢𝗗 𝗕𝗬𝗘 ✿ ◞';

        let message = '';
        if (action === 'add') {
            message =
`${cabecera}

  𖤐 usuario » ${userTags}
  𖤐 nombre » *${nombres}*
  𖤐 grupo » *${groupName}*
  𖤐 miembros » *${totalMembers}*
  𖤐 fecha » ${fecha} · ${hora}
  𖤐 descripción » ${descCorta}

${finalMsg}

> ✧ Usa *.menu* para ver los comandos 🍓`.trim();
        } else {
            message =
`${cabecera}

  𖤐 usuario » ${userTags}
  𖤐 nombre » *${nombres}*
  𖤐 grupo » *${groupName}*
  𖤐 miembros » *${totalMembers}*
  𖤐 fecha » ${fecha} · ${hora}

${finalMsg}

> ✧ Nunca te quisimos igual 😿`.trim();
        }

        const userPic = profilePics.find(pic => pic!== null);
        const imageUrl = userPic || groupProfilePic || global.icono;
        const fkontak = buildLocationQuoted(groupName);

        // Tarjeta con canvas: foto circular + fondo de Akame. Si falla, se usa la imagen de siempre.
        let tarjeta: Buffer | null = null;
        try {
            const fotoBuffer = userPic ? await axios.get(userPic, { responseType: 'arraybuffer', timeout: 5000 })
                .then((r) => Buffer.from(r.data)).catch(() => null) : null;
            tarjeta = await generarTarjetaBienvenida({
                tipo: action === 'add' ? 'add' : 'remove',
                nombre: nombreDe(mentions[0]),
                grupo: groupName,
                miembros: totalMembers,
                foto: fotoBuffer
            });
        } catch (err: any) {
            console.error('[TARJETA] falló, se usa la imagen normal:', err?.message);
        }

        const messageContent = tarjeta
            ? { image: tarjeta, caption: message, mentions: mentions }
            : {
                image: typeof imageUrl === 'string'? { url: imageUrl } : imageUrl,
                caption: message,
                mentions: mentions
            };

        await sock.sendMessage(chatJid, messageContent, { quoted: fkontak }).catch(() => {
            return sock.sendMessage(chatJid, {
                text: message,
                mentions: mentions
            }, { quoted: fkontak });
        });
    } catch (err) {
        console.error('[ ERROR GROUP PARTICIPANTS ]:', err);
    }
};
