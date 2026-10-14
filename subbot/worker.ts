// Proceso de un subbot. Lo lanza lib/subbots.ts con: node worker.ts <id> <vincular|restaurar>
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import P from 'pino';
import fs from 'node:fs';
import path from 'node:path';

const [, , ID, MODO] = process.argv;
const CARPETA = path.join(process.cwd(), 'subbots', ID);
const PERFIL = path.join(CARPETA, 'perfil.json');

type Perfil = { numero: string; nombre: string; prefijo: string; banner: string; bienvenida: string };

const leerPerfil = (): Perfil => JSON.parse(fs.readFileSync(PERFIL, 'utf8'));
const guardarPerfil = (p: Perfil) => fs.writeFileSync(PERFIL, JSON.stringify(p, null, 2));

const enviar = (m: any) => { try { process.send?.(m); } catch {} };

// Si el proceso principal se cae, este subbot también se cierra
process.on('disconnect', () => process.exit(0));

const numeroDe = (jid: string) => String(jid || '').split('@')[0].split(':')[0];

const textoDe = (m: any): string =>
    m?.message?.conversation ||
    m?.message?.extendedTextMessage?.text ||
    m?.message?.imageMessage?.caption ||
    m?.message?.videoMessage?.caption || '';

// ---------- Textos ----------

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME Subbot 🌸`;

const menuTexto = (p: Perfil) => caja(p.nombre.toUpperCase(), [
    `✧ Prefijo » ${p.prefijo}`,
    '',
    '*Cualquiera puede usar:*',
    `✦ ${p.prefijo}menu`,
    `✦ ${p.prefijo}ping`,
    `✦ ${p.prefijo}info`,
    '',
    '*Solo el dueño del subbot:*',
    `✦ ${p.prefijo}setnombre <texto>`,
    `✦ ${p.prefijo}setprefijo <símbolo>`,
    `✦ ${p.prefijo}setbanner <enlace de imagen>`,
    `✦ ${p.prefijo}setbienvenida <texto> | off`,
    `✦ ${p.prefijo}perfil`
]);

// ---------- Conexión ----------

let perfil: Perfil = leerPerfil();
let sock: any = null;
let yaPidioCodigo = false;

const conectar = async () => {
    const { state, saveCreds } = await useMultiFileAuthState(CARPETA);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Safari'),
        logger: P({ level: 'silent' }) as any,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        fireInitQueries: false,
        keepAliveIntervalMs: 30000,
        getMessage: async () => undefined
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }: any) => {
        if (connection === 'open') {
            enviar({ tipo: 'conectado' });
        }
        if (connection === 'close') {
            const codigo = lastDisconnect?.error?.output?.statusCode;
            if (codigo === DisconnectReason.loggedOut) {
                enviar({ tipo: 'desvinculado' });
                setTimeout(() => process.exit(0), 500);
            } else {
                setTimeout(() => conectar().catch(() => process.exit(1)), 5000);
            }
        }
    });

    // Pedir el código de vinculación solo al crear el subbot
    if (MODO === 'vincular' && !state.creds.registered && !yaPidioCodigo) {
        yaPidioCodigo = true;
        setTimeout(async () => {
            try {
                const raw: string = await sock.requestPairingCode(perfil.numero);
                const codigo = raw?.match(/.{1,4}/g)?.join('-') ?? raw;
                enviar({ tipo: 'codigo', codigo });
            } catch (e: any) {
                enviar({ tipo: 'error', motivo: `No se pudo generar el código: ${e?.message || 'error'}` });
                setTimeout(() => process.exit(1), 300);
            }
        }, 3000);
    }

    sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
        if (type !== 'notify') return;
        for (const m of messages || []) {
            try { await manejar(m); } catch (e: any) { console.log('[SUBBOT ERROR]', e?.message); }
        }
    });

    sock.ev.on('group-participants.update', async ({ id: grupo, participants, action }: any) => {
        if (action !== 'add' || !perfil.bienvenida) return;
        for (const jid of participants || []) {
            const num = numeroDe(jid);
            const texto = perfil.bienvenida.replace(/\{user\}/g, `@${num}`);
            await sock.sendMessage(grupo, {
                text: caja('BIENVENIDA', [texto]),
                mentions: [jid]
            }).catch(() => {});
        }
    });
};

// ---------- Comandos ----------

const manejar = async (m: any) => {
    const chat = m?.key?.remoteJid;
    if (!chat || chat === 'status@broadcast') return;

    const texto = textoDe(m).trim();
    const prefijo = perfil.prefijo;
    if (!texto.startsWith(prefijo)) return;

    const [cmd, ...resto] = texto.slice(prefijo.length).trim().split(/\s+/);
    const arg = resto.join(' ').trim();
    const comando = (cmd || '').toLowerCase();

    // Dueño del subbot: su propio número (fromMe) o el número vinculado
    const remitente = numeroDe(m.key.participant || chat);
    const esDueno = m.key.fromMe || remitente === perfil.numero;

    const responder = (content: any) => sock.sendMessage(chat, content, { quoted: m });

    switch (comando) {
        case 'menu':
        case 'help':
            if (perfil.banner) {
                return responder({ image: { url: perfil.banner }, caption: menuTexto(perfil) });
            }
            return responder({ text: menuTexto(perfil) });

        case 'ping': {
            const t0 = Date.now();
            return responder({ text: caja('PING', [`✧ Respuesta » ${Date.now() - t0} ms`, '✦ Estado » en línea']) });
        }

        case 'info':
            return responder({ text: caja('INFO', [
                `✧ Nombre » ${perfil.nombre}`,
                `✦ Prefijo » ${perfil.prefijo}`,
                `✩ Bienvenida » ${perfil.bienvenida ? 'activa' : 'desactivada'}`
            ]) });

        case 'perfil': {
            if (!esDueno) return responder({ text: '🌸 Solo el dueño del subbot puede ver el perfil.' });
            return responder({ text: caja('PERFIL', [
                `✧ Nombre » ${perfil.nombre}`,
                `✦ Prefijo » ${perfil.prefijo}`,
                `✩ Banner » ${perfil.banner ? 'personalizado' : 'por defecto'}`,
                `❖ Bienvenida » ${perfil.bienvenida || 'desactivada'}`
            ]) });
        }

        case 'setnombre':
        case 'setprefijo':
        case 'setbanner':
        case 'setbienvenida': {
            if (!esDueno) return responder({ text: '🌸 Solo el dueño del subbot puede cambiar esto.' });
            if (!arg) return responder({ text: `🌸 Escribe el valor después del comando. Ej: ${prefijo}${comando} <valor>` });
            return responder({ text: guardarCambio(comando, arg) });
        }

        default:
            return; // comando desconocido: silencio
    }
};

const guardarCambio = (comando: string, arg: string): string => {
    if (comando === 'setnombre') {
        if (arg.length > 30) return '🌸 El nombre puede tener hasta 30 caracteres.';
        perfil.nombre = arg;
        guardarPerfil(perfil);
        return caja('LISTO', [`✧ Nombre » ${arg}`]);
    }
    if (comando === 'setprefijo') {
        if (arg.length > 2) return '🌸 El prefijo puede tener hasta 2 caracteres.';
        perfil.prefijo = arg;
        guardarPerfil(perfil);
        return caja('LISTO', [`✧ Prefijo » ${arg}`]);
    }
    if (comando === 'setbanner') {
        if (!/^https?:\/\//i.test(arg)) return '🌸 El banner debe ser un enlace que empiece con http o https.';
        perfil.banner = arg;
        guardarPerfil(perfil);
        return caja('LISTO', ['✧ Banner del menú » actualizado']);
    }
    // setbienvenida
    if (arg.toLowerCase() === 'off') {
        perfil.bienvenida = '';
        guardarPerfil(perfil);
        return caja('LISTO', ['✧ Bienvenida » desactivada']);
    }
    if (arg.length > 300) return '🌸 La bienvenida puede tener hasta 300 caracteres.';
    perfil.bienvenida = arg;
    guardarPerfil(perfil);
    return caja('LISTO', ['✧ Bienvenida » activada', '', 'Usa {user} para mencionar a la persona.']);
};

// Sin perfil no hay nada que hacer
if (!ID || !fs.existsSync(PERFIL)) {
    console.log('[SUBBOT] perfil no encontrado, cerrando');
    process.exit(1);
}

conectar().catch((e) => {
    enviar({ tipo: 'error', motivo: e?.message || 'error al conectar' });
    process.exit(1);
});

