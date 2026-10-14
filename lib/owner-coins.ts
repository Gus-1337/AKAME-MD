import { ecoUser } from '#shop';
import { saveDB } from '#db';

/**
 * Helpers de los comandos del dueño .addmoney y .removemoney.
 * Trabajan sobre las mismas coins de la economía (db.chats[chat].users[jid].coins).
 */

// Lo más grande que se puede guardar con exactitud en JavaScript: lo que se llama "infinito" aquí
export const INF = Number.MAX_SAFE_INTEGER;

const PALABRAS_INF = new Set(['inf', 'infinito', 'infinity', '∞']);

export type Monto = { tipo: 'inf' } | { tipo: 'num'; valor: number };

/**
 * Lee la cantidad de los argumentos. Ignora las menciones (@usuario).
 * Acepta 5000, 5.000, 5,000 o inf / infinito.
 */
export const leerMonto = (args: string[]): Monto | null => {
    for (const raw of args || []) {
        const t = String(raw).trim().toLowerCase();
        if (!t || t.startsWith('@')) continue;
        if (PALABRAS_INF.has(t)) return { tipo: 'inf' };
        if (/^\d{1,3}([.,_]\d{3})+$|^\d+$/.test(t)) {
            const valor = Number(t.replace(/[.,_]/g, ''));
            if (Number.isSafeInteger(valor) && valor > 0) return { tipo: 'num', valor };
        }
    }
    return null;
};

/** A quién se le aplica: al que se responde, al mencionado, o a quien escribe. */
export const resolverObjetivo = (m: any, yo: string): string => {
    const respondido = m?.message?.extendedTextMessage?.contextInfo?.participant;
    if (respondido) return respondido;
    if (m?.mentionedJid?.length) return m.mentionedJid[0];
    return yo;
};

export const formatear = (n: number): string => (n >= INF ? '∞' : n.toLocaleString('es-PE'));

/** Suma o quita coins. Devuelve el saldo nuevo. */
export const cambiarCoins = (chat: string, jid: string, op: 'add' | 'remove', monto: Monto): number => {
    const u = ecoUser(chat, jid);
    const actual = Number(u.coins) || 0;
    let nuevo: number;
    if (op === 'add') {
        nuevo = monto.tipo === 'inf' ? INF : Math.min(INF, actual + monto.valor);
    } else {
        nuevo = monto.tipo === 'inf' ? 0 : Math.max(0, actual - monto.valor);
    }
    u.coins = nuevo;
    saveDB(chat, jid);
    return nuevo;
};

export const textoMonto = (monto: Monto): string =>
    monto.tipo === 'inf' ? '∞' : monto.valor.toLocaleString('es-PE');
