import fs from 'node:fs';
import path from 'node:path';
import config from '#config';

/**
 * Modo subbot. El mismo index.ts corre como subbot cuando lo lanza lib/subbots.ts
 * con AKAME_SUBBOT_ID y AKAME_SUBBOT_MODO (vincular | restaurar).
 * Aquí viven los comandos de personalización del dueño del subbot:
 * .setname, .setbanner, .setprefix, .setbienvenida, .stop y .reactivar.
 * Todo lo demás lo hace el handler normal.
 */

export const SUBBOT_ID = process.env.AKAME_SUBBOT_ID || '';
export const SUBBOT_MODO = process.env.AKAME_SUBBOT_MODO || '';
export const esSubbot = Boolean(SUBBOT_ID);
export const CARPETA_SUBBOT = esSubbot ? path.join(process.cwd(), 'subbots', SUBBOT_ID) : '';
const PERFIL = path.join(CARPETA_SUBBOT, 'perfil.json');

export type Perfil = { numero: string; nombre: string; prefijo: string; banner: string; bienvenida: string };

const DEFECTO: Perfil = { numero: '', nombre: 'AKAME Subbot', prefijo: '.', banner: '', bienvenida: '' };

// Valores originales del bot, para volver a ellos si el subbot borra su banner
const BANNER_BASE = (config as any).banner;
const BANNERS_BASE = (config as any).banners;

(global as any).esSubbot = esSubbot;

export const leerPerfil = (): Perfil => {
    try { return { ...DEFECTO, ...JSON.parse(fs.readFileSync(PERFIL, 'utf8')) }; } catch {
        return { ...DEFECTO };
    }
};

/** Aplica el perfil al bot de este proceso: nombre, banner del menú y prefijo. */
const aplicarAlBot = (p: Perfil) => {
    (global as any).subbotPerfil = p;
    (global as any).botName = p.nombre;
    (config as any).botName = p.nombre;
    (config as any).banner = p.banner || BANNER_BASE;
    // Con banner propio no se usan los banners por categoría del bot principal
    (config as any).banners = p.banner ? {} : BANNERS_BASE;
    if ((global as any).db?.data) {
        (global as any).db.data.settings = { ...((global as any).db.data.settings || {}), globalPrefix: p.prefijo };
    }
};

const guardarPerfil = (p: Perfil) => {
    fs.writeFileSync(PERFIL, JSON.stringify(p, null, 2));
    aplicarAlBot(p);
};

/** Al arrancar: aplica el perfil guardado. */
export const aplicarPerfil = (): Perfil => {
    const p = leerPerfil();
    aplicarAlBot(p);
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

const COMANDOS = new Set(['setname', 'setbanner', 'setprefix', 'setbienvenida', 'stop', 'reactivar']);

/**
 * Atiende los comandos de personalización. Devuelve true si el mensaje era uno de ellos
 * (en ese caso el handler normal no lo procesa).
 */
export const manejarPersonal = (sock: any, m: any): boolean => {
    if (!esSubbot) return false;
    const chat = m?.key?.remoteJid;
    if (!chat || chat === 'status@broadcast') return false;

    const perfil = leerPerfil();
    const prefijo = String((global as any).db?.data?.settings?.globalPrefix || perfil.prefijo || '.').charAt(0) || '.';
    const texto = textoDe(m).trim();
    if (!texto.startsWith(prefijo)) return false;

    const [cmd, ...resto] = texto.slice(prefijo.length).trim().split(/\s+/);
    const comando = (cmd || '').toLowerCase();
    if (!COMANDOS.has(comando)) return false;

    const arg = resto.join(' ').trim();
    const remitente = numeroDe(m.key.participant || chat);
    const esDueno = Boolean(m.key.fromMe) || (perfil.numero && remitente === perfil.numero);
    const responder = (text: string) => sock.sendMessage(chat, { text }, { quoted: m }).catch(() => {});

    if (!esDueno) {
        responder('🌸 Solo el dueño del subbot puede usar este comando.');
        return true;
    }

    if (comando === 'reactivar') {
        responder(caja('ACTIVO', ['✧ Tu subbot ya está encendido.']));
        return true;
    }

    if (comando === 'stop') {
        responder(caja('PAUSADO', [
            '✧ Tu subbot se apagó temporalmente.',
            '✦ Para encenderlo otra vez escribe .reactivar al bot principal.'
        ]));
        // Dar tiempo a que salga el mensaje y pedirle al padre que no lo vuelva a levantar
        setTimeout(() => { reportar({ tipo: 'pausar' }); setTimeout(() => process.exit(0), 500); }, 800);
        return true;
    }

    if (!arg) {
        responder(`🌸 Escribe el valor después del comando. Ej: ${prefijo}${comando} <valor>`);
        return true;
    }

    if (comando === 'setname') {
        if (arg.length > 30) { responder('🌸 El nombre puede tener hasta 30 caracteres.'); return true; }
        guardarPerfil({ ...perfil, nombre: arg });
        responder(caja('LISTO', [`✧ Nombre » ${arg}`]));
        return true;
    }

    if (comando === 'setprefix') {
        // Solo símbolos, de 1 a 2 caracteres (ej. ! # /)
        if (arg.length > 2 || /[\p{L}\p{N}\s]/u.test(arg)) {
            responder('🌸 El prefijo debe ser de 1 o 2 símbolos, sin letras ni números. Ej: !');
            return true;
        }
        guardarPerfil({ ...perfil, prefijo: arg });
        responder(caja('LISTO', [`✧ Prefijo » ${arg}`, `✦ Ahora usa ${arg}menu`]));
        return true;
    }

    if (comando === 'setbienvenida') {
        if (arg.toLowerCase() === 'off') {
            guardarPerfil({ ...perfil, bienvenida: '' });
            responder(caja('LISTO', ['✧ Bienvenida » desactivada']));
            return true;
        }
        if (arg.length > 300) { responder('🌸 La bienvenida puede tener hasta 300 caracteres.'); return true; }
        guardarPerfil({ ...perfil, bienvenida: arg });
        responder(caja('LISTO', ['✧ Bienvenida » activada', '', 'Usa {user} para mencionar a la persona.']));
        return true;
    }

    // setbanner
    if (arg.toLowerCase() === 'off') {
        guardarPerfil({ ...perfil, banner: '' });
        responder(caja('LISTO', ['✧ Banner » volvió al predeterminado']));
        return true;
    }
    if (!/^https?:\/\//i.test(arg)) {
        responder('🌸 El banner debe ser un enlace que empiece con http o https. Ej: .setbanner https://...');
        return true;
    }
    guardarPerfil({ ...perfil, banner: arg });
    responder(caja('LISTO', ['✧ Banner del menú » actualizado']));
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
