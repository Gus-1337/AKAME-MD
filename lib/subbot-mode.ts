import fs from 'node:fs';
import path from 'node:path';

/**
 * Modo subbot. El mismo index.ts corre como subbot cuando lo lanza lib/subbots.ts
 * con AKAME_SUBBOT_ID y AKAME_SUBBOT_MODO (vincular | restaurar).
 * Aquí viven solo las cosas propias de cada subbot: su perfil, sus comandos de
 * personalización y su bienvenida. Todo lo demás lo hace el handler normal.
 */

export const SUBBOT_ID = process.env.AKAME_SUBBOT_ID || '';
export const SUBBOT_MODO = process.env.AKAME_SUBBOT_MODO || '';
export const esSubbot = Boolean(SUBBOT_ID);
export const CARPETA_SUBBOT = esSubbot ? path.join(process.cwd(), 'subbots', SUBBOT_ID) : '';
const PERFIL = path.join(CARPETA_SUBBOT, 'perfil.json');

export type Perfil = { numero: string; nombre: string; prefijo: string; banner: string; bienvenida: string };

(global as any).esSubbot = esSubbot;

export const leerPerfil = (): Perfil => {
    try { return JSON.parse(fs.readFileSync(PERFIL, 'utf8')); } catch {
        return { numero: '', nombre: 'AKAME Subbot', prefijo: '.', banner: '', bienvenida: '' };
    }
};

const guardarPerfil = (p: Perfil) => {
    fs.writeFileSync(PERFIL, JSON.stringify(p, null, 2));
    (global as any).subbotPerfil = p;
    if (!(global as any).db) return;
    (global as any).db.data.settings = { ...((global as any).db.data.settings || {}), globalPrefix: p.prefijo };
};

/** Aplica el perfil al arrancar: prefijo y nombre del subbot. */
export const aplicarPerfil = (): Perfil => {
    const p = leerPerfil();
    (global as any).subbotPerfil = p;
    (global as any).botName = p.nombre;
    if ((global as any).db) {
        (global as any).db.data.settings = { ...((global as any).db.data.settings || {}), globalPrefix: p.prefijo };
    }
    return p;
};

/** Avisa al proceso principal (lib/subbots.ts). */
export const reportar = (m: any) => { try { process.send?.(m); } catch {} };

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> ${leerPerfil().nombre} 🌸`;

const numeroDe = (jid: string) => String(jid || '').split('@')[0].split(':')[0];

const textoDe = (m: any): string =>
    m?.message?.conversation ||
    m?.message?.extendedTextMessage?.text ||
    m?.message?.imageMessage?.caption ||
    m?.message?.videoMessage?.caption || '';

const guardarCambio = (comando: string, arg: string): string => {
    const p = leerPerfil();
    if (comando === 'setnombre') {
        if (arg.length > 30) return '🌸 El nombre puede tener hasta 30 caracteres.';
        p.nombre = arg;
        guardarPerfil(p);
        return caja('LISTO', [`✧ Nombre » ${arg}`]);
    }
    if (comando === 'setprefijo') {
        if (arg.length > 2) return '🌸 El prefijo puede tener hasta 2 caracteres.';
        p.prefijo = arg;
        guardarPerfil(p);
        return caja('LISTO', [`✧ Prefijo » ${arg}`]);
    }
    if (comando === 'setbanner') {
        if (!/^https?:\/\//i.test(arg)) return '🌸 El banner debe ser un enlace que empiece con http o https.';
        p.banner = arg;
        guardarPerfil(p);
        return caja('LISTO', ['✧ Banner del menú » actualizado']);
    }
    // setbienvenida
    if (arg.toLowerCase() === 'off') {
        p.bienvenida = '';
        guardarPerfil(p);
        return caja('LISTO', ['✧ Bienvenida » desactivada']);
    }
    if (arg.length > 300) return '🌸 La bienvenida puede tener hasta 300 caracteres.';
    p.bienvenida = arg;
    guardarPerfil(p);
    return caja('LISTO', ['✧ Bienvenida » activada', '', 'Usa {user} para mencionar a la persona.']);
};

const PERSONALES = new Set(['perfil', 'setnombre', 'setprefijo', 'setbanner', 'setbienvenida']);

/**
 * Atiende los comandos de personalización. Devuelve true si el mensaje era uno de ellos
 * (en ese caso el handler normal no lo procesa).
 */
export const manejarPersonal = (sock: any, m: any): boolean => {
    if (!esSubbot) return false;
    const chat = m?.key?.remoteJid;
    if (!chat || chat === 'status@broadcast') return false;

    const perfil = leerPerfil();
    const texto = textoDe(m).trim();
    if (!texto.startsWith(perfil.prefijo)) return false;

    const [cmd, ...resto] = texto.slice(perfil.prefijo.length).trim().split(/\s+/);
    const comando = (cmd || '').toLowerCase();
    if (!PERSONALES.has(comando)) return false;

    const arg = resto.join(' ').trim();
    const remitente = numeroDe(m.key.participant || chat);
    const esDueno = Boolean(m.key.fromMe) || (perfil.numero && remitente === perfil.numero);
    const responder = (text: string) => sock.sendMessage(chat, { text }, { quoted: m }).catch(() => {});

    if (!esDueno) {
        responder('🌸 Solo el dueño del subbot puede usar este comando.');
        return true;
    }
    if (comando === 'perfil') {
        responder(caja('PERFIL', [
            `✧ Nombre » ${perfil.nombre}`,
            `✦ Prefijo » ${perfil.prefijo}`,
            `✩ Banner » ${perfil.banner ? 'personalizado' : 'por defecto'}`,
            `❖ Bienvenida » ${perfil.bienvenida || 'desactivada'}`
        ]));
        return true;
    }
    if (!arg) {
        responder(`🌸 Escribe el valor después del comando. Ej: ${perfil.prefijo}${comando} <valor>`);
        return true;
    }
    responder(guardarCambio(comando, arg));
    return true;
};

/** Bienvenida propia del subbot (la configura su dueño con .setbienvenida). */
export const bienvenidaSubbot = async (sock: any, { id: grupo, participants, action }: any) => {
    if (!esSubbot || action !== 'add') return;
    const perfil = leerPerfil();
    if (!perfil.bienvenida) return;
    for (const jid of participants || []) {
        const texto = perfil.bienvenida.replace(/\{user\}/g, `@${numeroDe(jid)}`);
        await sock.sendMessage(grupo, { text: caja('BIENVENIDA', [texto]), mentions: [jid] }).catch(() => {});
    }
};
