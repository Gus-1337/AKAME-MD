import fs from 'node:fs';
import path from 'node:path';

/**
 * Modo subbot. El mismo index.ts corre como subbot cuando lo lanza lib/subbots.ts
 * con AKAME_SUBBOT_ID y AKAME_SUBBOT_MODO (vincular | restaurar).
 * Aquí viven solo los comandos de personalización del dueño del subbot:
 * .setbanner, .setname, .stop y .reactivar. Todo lo demás lo hace el handler normal.
 */

export const SUBBOT_ID = process.env.AKAME_SUBBOT_ID || '';
export const SUBBOT_MODO = process.env.AKAME_SUBBOT_MODO || '';
export const esSubbot = Boolean(SUBBOT_ID);
export const CARPETA_SUBBOT = esSubbot ? path.join(process.cwd(), 'subbots', SUBBOT_ID) : '';
const PERFIL = path.join(CARPETA_SUBBOT, 'perfil.json');

export type Perfil = { numero: string; nombre: string; banner: string };

(global as any).esSubbot = esSubbot;

export const leerPerfil = (): Perfil => {
    try { return JSON.parse(fs.readFileSync(PERFIL, 'utf8')); } catch {
        return { numero: '', nombre: 'AKAME Subbot', banner: '' };
    }
};

const guardarPerfil = (p: Perfil) => {
    fs.writeFileSync(PERFIL, JSON.stringify(p, null, 2));
    (global as any).subbotPerfil = p;
};

/** Aplica el perfil al arrancar: nombre y banner del menú. */
export const aplicarPerfil = (): Perfil => {
    const p = leerPerfil();
    (global as any).subbotPerfil = p;
    (global as any).botName = p.nombre;
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

const COMANDOS = new Set(['setbanner', 'setname', 'stop', 'reactivar']);

/**
 * Atiende los comandos de personalización. Devuelve true si el mensaje era uno de ellos
 * (en ese caso el handler normal no lo procesa).
 */
export const manejarPersonal = (sock: any, m: any): boolean => {
    if (!esSubbot) return false;
    const chat = m?.key?.remoteJid;
    if (!chat || chat === 'status@broadcast') return false;

    const perfil = leerPerfil();
    const prefijo = String((global as any).db?.data?.settings?.globalPrefix || '.').charAt(0) || '.';
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

    // setbanner
    if (!/^https?:\/\//i.test(arg)) {
        responder('🌸 El banner debe ser un enlace que empiece con http o https.');
        return true;
    }
    guardarPerfil({ ...perfil, banner: arg });
    responder(caja('LISTO', ['✧ Banner del menú » actualizado']));
    return true;
};
