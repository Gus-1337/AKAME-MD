import { estaActiva } from './ajustes.ts';
import { listarSubbots } from './subbots.ts';

/**
 * AntiBot: expulsa al instante a quien entra con un nombre de bot.
 * WhatsApp no marca a los bots, así que la detección no es total.
 * Números de bots conocidos (sin +, solo dígitos). Se pueden agregar aquí.
 */
const NUMEROS_BOT: string[] = [];

/** Nombres de quienes escriben en grupos (WhatsApp no manda el nombre al entrar). */
const nombres = new Map<string, string>();
const MAX_NOMBRES = 5000;

export const recordarNombre = (rawMsg: any) => {
    const jid = rawMsg?.key?.participant || rawMsg?.participant || '';
    const nombre = rawMsg?.pushName;
    if (!jid || !nombre) return;
    if (nombres.size >= MAX_NOMBRES) nombres.delete(nombres.keys().next().value as string);
    nombres.set(jid, nombre);
};

const numero = (jid: string) => jid.split('@')[0].split(':')[0];

const esNuestro = (sock: any, jid: string): boolean => {
    const n = numero(jid);
    if (sock.user?.id && numero(sock.user.id) === n) return true;
    if (sock.user?.lid && numero(sock.user.lid) === n) return true;
    return listarSubbots().some((s) => s.numero && numero(s.numero) === n);
};

const pareceBot = (jid: string): boolean => {
    if (NUMEROS_BOT.includes(numero(jid))) return true;
    const nombre = nombres.get(jid) || '';
    return /bot/i.test(nombre);
};

/** Revisa a quien acaba de entrar a un grupo con AntiBot activo. */
export const revisarIngreso = async (sock: any, update: any): Promise<void> => {
    if (update?.action !== 'add') return;
    const grupo = update.id;
    if (!estaActiva(global.db?.data?.chats?.[grupo], 'antibot')) return;

    for (const p of update.participants || []) {
        const jid = typeof p === 'string' ? p : p?.id;
        if (!jid || esNuestro(sock, jid)) continue;
        if (!pareceBot(jid)) continue;
        try {
            await sock.groupParticipantsUpdate(grupo, [jid], 'remove');
            await sock.sendMessage(grupo, {
                text: `✦ *ANTIBOT* ✦\n\n✧ @${numero(jid)} fue expulsado por parecer un bot.`,
                mentions: [jid]
            });
        } catch (err: any) {
            console.error('[ANTIBOT] no pude expulsar:', err?.message);
        }
    }
};
