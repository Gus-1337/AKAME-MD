import { saveDB } from '#db';
import { esSubbot, leerPerfil, leerGrupos, guardarGrupos } from './subbot-mode.ts';

// Panel web del dueño (lado del subbot).
// El bot principal le manda pedidos por IPC y este módulo responde:
//   panel_codigo  -> envía el código de acceso al número del dueño por WhatsApp
//   pedir_grupos  -> lista de grupos y su configuración actual
//   panel_aplicar -> aplica los cambios (responde, antilink, antitoxic, antispam)
// Solo corre dentro de un subbot (AKAME_SUBBOT_ID).

const DEFAULT_SPAM = { max: 6, seconds: 5, warns: 2 };
const MODOS = new Set(['activo', 'solo', 'apagado']);

let sockActual: any = null;
let registrado = false;

/** Guarda el socket vigente para poder escribir en WhatsApp. */
export const usarSockPanel = (sock: any) => { sockActual = sock; };

const responder = (req: string, datos: Record<string, unknown>) => {
    try { process.send?.({ tipo: 'panel_resp', req, ...datos }); } catch {}
};

const chatDe = (grupo: string) => {
    const chats = (global as any).db?.data?.chats || {};
    return chats[grupo] || {};
};

const enteroEn = (v: unknown, min: number, max: number): number | null => {
    const n = Number(v);
    return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

const aplicarCambios = (cambios: Record<string, any>): number => {
    const chats = (global as any).db.data.chats;
    const modos = leerGrupos();
    let aplicados = 0;

    for (const [jid, c] of Object.entries(cambios || {})) {
        if (!String(jid).endsWith('@g.us') || !c || typeof c !== 'object') continue;

        if (c.responde !== undefined) {
            if (!MODOS.has(c.responde)) continue;
            if (c.responde === 'activo') delete modos[jid];
            else modos[jid] = c.responde;
        }

        if (!chats[jid]) chats[jid] = {};
        const chatDb = chats[jid];
        if (typeof c.antilink === 'boolean') chatDb.antilinks = c.antilink;
        if (typeof c.antitoxic === 'boolean') chatDb.antitoxic = c.antitoxic;
        if (typeof c.antispam === 'boolean') chatDb.antiSpam = c.antispam;
        if (c.antispamCfg && typeof c.antispamCfg === 'object') {
            const max = enteroEn(c.antispamCfg.max, 1, 50);
            const seconds = enteroEn(c.antispamCfg.seconds, 1, 3600);
            const warns = enteroEn(c.antispamCfg.warns, 0, 10);
            if (max !== null && seconds !== null && warns !== null) {
                chatDb.antiSpamCfg = { max, seconds, warns };
            }
        }
        try { saveDB(jid); } catch {}
        aplicados++;
    }

    guardarGrupos(modos);
    return aplicados;
};

const manejar = async (m: any) => {
    if (!m || typeof m !== 'object' || !m.tipo || !m.req) return;
    const req = String(m.req);

    try {
        if (m.tipo === 'panel_codigo') {
            const perfil = leerPerfil();
            if (!sockActual || !perfil.numero) return responder(req, { error: 'El subbot no está conectado' });
            const codigo = String(m.codigo || '').replace(/\D/g, '').slice(0, 6);
            if (codigo.length !== 6) return responder(req, { error: 'Código inválido' });
            const texto = [
                '🔐 *Código para el panel de tu subbot*',
                '',
                `✧ *${codigo}*`,
                '',
                '✦ Vence en 5 minutos.',
                '✦ No lo compartas con nadie.'
            ].join('\n');
            await sockActual.sendMessage(`${perfil.numero}@s.whatsapp.net`, { text: texto });
            return responder(req, { ok: true });
        }

        if (m.tipo === 'pedir_grupos') {
            if (!sockActual) return responder(req, { error: 'El subbot no está conectado' });
            const todos = await sockActual.groupFetchAllParticipating();
            const modos = leerGrupos();
            const grupos = Object.values(todos || {}).map((g: any) => {
                const chatDb = chatDe(g.id);
                return {
                    jid: g.id,
                    nombre: String(g.subject || 'Grupo').slice(0, 80),
                    responde: MODOS.has(modos[g.id]) ? modos[g.id] : 'activo',
                    antilink: !!chatDb.antilinks,
                    antitoxic: !!chatDb.antitoxic,
                    antispam: !!chatDb.antiSpam,
                    antispamCfg: chatDb.antiSpamCfg || DEFAULT_SPAM
                };
            });
            grupos.sort((a, b) => a.nombre.localeCompare(b.nombre));
            return responder(req, { grupos });
        }

        if (m.tipo === 'panel_aplicar') {
            const aplicados = aplicarCambios(m.cambios || {});
            return responder(req, { ok: true, aplicados });
        }
    } catch (e: any) {
        return responder(req, { error: e?.message || 'Error interno del subbot' });
    }
};

// Solo el subbot escucha estos pedidos
if (esSubbot && !registrado) {
    registrado = true;
    process.on('message', (m: any) => { void manejar(m); });
}
