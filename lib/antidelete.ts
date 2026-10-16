import { downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import { estaActiva } from './ajustes.ts';

/** Mensajes recientes de grupos (sólo referencias). Se borran solos a las 2 horas o al pasar de 3000. */
const TTL_MS = 2 * 60 * 60 * 1000;
const MAX = 3000;
const recientes = new Map<string, { key: any; message: any; ts: number }>();

const limpiar = () => {
    const ahora = Date.now();
    for (const [id, v] of recientes) {
        if (ahora - v.ts > TTL_MS) recientes.delete(id);
    }
    while (recientes.size > MAX) {
        const primero = recientes.keys().next().value;
        if (primero === undefined) break;
        recientes.delete(primero);
    }
};

/** Quita las capas de envoltura (efímeros, ver una vez, documentos con pie). */
export const desenvolver = (message: any): any => {
    let raw = message;
    if (raw?.ephemeralMessage) raw = raw.ephemeralMessage.message;
    if (raw?.viewOnceMessage) raw = raw.viewOnceMessage.message;
    if (raw?.viewOnceMessageV2) raw = raw.viewOnceMessageV2.message;
    if (raw?.viewOnceMessageV2Extension) raw = raw.viewOnceMessageV2Extension.message;
    if (raw?.documentWithCaptionMessage) raw = raw.documentWithCaptionMessage.message;
    return raw || {};
};

const esGrupo = (jid: string) => jid.endsWith('@g.us');

/** Guarda el mensaje de un grupo para poder reenviarlo si lo borran. */
export const guardarParaAntidelete = (rawMsg: any) => {
    const jid = rawMsg?.key?.remoteJid || '';
    if (!esGrupo(jid) || rawMsg.key.fromMe || !rawMsg.message) return;
    if (rawMsg.message.protocolMessage) return;
    recientes.set(rawMsg.key.id, { key: rawMsg.key, message: rawMsg.message, ts: Date.now() });
    if (recientes.size > MAX) limpiar();
};

const textoDe = (c: any): string => {
    if (!c) return '';
    return c.conversation || c.extendedTextMessage?.text || c.imageMessage?.caption ||
        c.videoMessage?.caption || c.documentMessage?.caption || '';
};

/** Si alguien borra un mensaje en un grupo con AntiDelete activo, lo reenvía. */
export const procesarRevocacion = async (sock: any, rawMsg: any): Promise<void> => {
    const proto = rawMsg?.message?.protocolMessage;
    if (!proto || proto.type !== 0) return; // 0 = REVOKE (eliminar para todos)

    const chat = rawMsg.key.remoteJid;
    if (!esGrupo(chat)) return;
    if (!estaActiva(global.db?.data?.chats?.[chat], 'antidelete')) return;

    const original = recientes.get(proto.key?.id);
    recientes.delete(proto.key?.id);
    if (!original) return;

    const borro = rawMsg.key.participant || rawMsg.participant || '';
    const envio = original.key.participant || original.key.remoteJid || '';
    const numBorro = borro.split('@')[0];
    const numEnvio = envio.split('@')[0];
    const cabecera =
        `✦ *ANTIDELETE* ✦\n\n` +
        `✧ Borrado por » @${numBorro}\n` +
        (numEnvio && numEnvio !== numBorro ? `✧ Enviado por » @${numEnvio}\n` : '') +
        `\n`;
    const mentions = [borro, envio].filter(Boolean);

    const contenido = desenvolver(original.message);
    const texto = textoDe(contenido);
    const tipo = Object.keys(contenido).find((k) => /Message$/.test(k) && k !== 'protocolMessage') || '';
    const esMedia = ['imageMessage', 'videoMessage', 'audioMessage', 'stickerMessage', 'documentMessage'].includes(tipo);

    try {
        if (esMedia) {
            const buf = await downloadMediaMessage(
                { key: original.key, message: original.message } as any,
                'buffer',
                {},
                { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage }
            ) as Buffer;
            const caption = cabecera + (texto ? `✧ Mensaje » ${texto}` : '✧ (archivo)');
            if (tipo === 'imageMessage') {
                await sock.sendMessage(chat, { image: buf, caption, mentions }); return;
            }
            if (tipo === 'videoMessage') {
                await sock.sendMessage(chat, { video: buf, caption, mentions }); return;
            }
            if (tipo === 'audioMessage') {
                await sock.sendMessage(chat, { text: cabecera.trim(), mentions });
                await sock.sendMessage(chat, {
                    audio: buf,
                    mimetype: contenido.audioMessage?.mimetype || 'audio/ogg; codecs=opus',
                    ptt: !!contenido.audioMessage?.ptt
                });
            }
            await sock.sendMessage(chat, { document: buf, mimetype: contenido[tipo]?.mimetype || 'application/octet-stream', fileName: contenido[tipo]?.fileName || 'archivo', caption, mentions }); return;
        }

        if (texto) {
            await sock.sendMessage(chat, { text: cabecera + `✧ Mensaje » ${texto}`, mentions }); return;
        }
    } catch (err: any) {
        console.error('[ANTIDELETE] no se pudo reenviar:', err?.message);
        await sock.sendMessage(chat, { text: cabecera + '✧ No pude recuperar el contenido.', mentions }).catch(() => null);
    }
};

/** AntiVer: si llega un "ver una vez" a un grupo con AntiVer activo, lo manda como archivo normal. */
export const procesarVerUnaVez = async (sock: any, rawMsg: any): Promise<void> => {
    const chat = rawMsg?.key?.remoteJid || '';
    if (!esGrupo(chat) || rawMsg.key.fromMe) return;
    if (!estaActiva(global.db?.data?.chats?.[chat], 'antiver')) return;

    const raw = rawMsg.message || {};
    // Dos formatos: envoltorio viewOnceMessage*, o la marca viewOnce:true dentro del archivo
    const envuelto = raw.viewOnceMessage?.message || raw.viewOnceMessageV2?.message || raw.viewOnceMessageV2Extension?.message;
    const inner = envuelto || raw;
    const tipo = ['imageMessage', 'videoMessage', 'audioMessage'].find((t) => inner[t] && (envuelto || inner[t].viewOnce)) || '';
    if (!tipo) return;

    const quien = rawMsg.key.participant || rawMsg.participant || '';
    const num = quien.split('@')[0];
    const pie = inner[tipo]?.caption ? '\n✧ ' + inner[tipo].caption : '';
    const caption = `👁 *Ver una vez de* @${num}${pie}`;
    const mentions = quien ? [quien] : [];

    try {
        const buf = await downloadMediaMessage(
            { key: rawMsg.key, message: { [tipo]: inner[tipo] } } as any,
            'buffer',
            {},
            { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage }
        ) as Buffer;

        if (tipo === 'imageMessage') await sock.sendMessage(chat, { image: buf, caption, mentions });
        else if (tipo === 'videoMessage') await sock.sendMessage(chat, { video: buf, caption, mentions });
        else {
            await sock.sendMessage(chat, { text: caption, mentions });
            await sock.sendMessage(chat, { audio: buf, mimetype: inner.audioMessage?.mimetype || 'audio/ogg; codecs=opus', ptt: !!inner.audioMessage?.ptt });
        }
        console.log('[ANTIVER] reenviado', tipo, 'de', num);
    } catch (err: any) {
        console.error('[ANTIVER] no se pudo reenviar:', tipo, err?.message);
    }
};
