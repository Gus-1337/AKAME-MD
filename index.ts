import './lib/env.ts';
import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} from '@whiskeysockets/baileys';
import P from 'pino';
import { Boom } from '@hapi/boom';
import chalk from 'chalk';
import fs, { promises as fsPromises } from 'fs';
import path, { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import readline from 'readline';
import qrcode from 'qrcode';
import { EventEmitter } from 'events';
import { LRUCache } from 'lru-cache';
import debounce from 'lodash.debounce';
import Agent from 'node:https';
import { serialize } from '#simple';
import { loadDB } from '#db';
import config from '#config';
import { handler, invalidateGroupCache } from '#handler';
import printMessageLog from './lib/printlog.ts';
import { handleGroupAlerts, handleGroupParticipants } from '#alertas';
import { avisarReinicio } from './commands/owner/restart.ts';
import { restaurarSubbots } from './lib/subbots.ts';
import { iniciarVincularWeb } from './lib/vincular-puente.ts';
import { usarSockPanel } from './lib/subbot-panel.ts';
import { guardarParaAntidelete, procesarRevocacion, procesarVerUnaVez } from './lib/antidelete.ts';
import { revisarIngreso, recordarNombre } from './lib/antibot.ts';
import { leerPrefijo } from './lib/prefijo.ts';
import { esSubbot, SUBBOT_MODO, CARPETA_SUBBOT, aplicarPerfil, leerPerfil, manejarPersonal, bienvenidaSubbot, reportar, filtrarGrupo } from './lib/subbot-mode.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

declare global {
    var botName: string;
    var plugins: Record<string, any>;
    var eventBus: EventEmitter;
    var broadcast: (event: string, payload: any) => void;
}

globalThis.botName = config?.botName || 'AKAME-MD';
globalThis.plugins = globalThis.plugins || {};

export const eventBus = globalThis.eventBus || new EventEmitter();
eventBus.setMaxListeners(50);
globalThis.eventBus = eventBus;

export function broadcast(event: string, payload: any) {
    eventBus.emit(event, { payload, timestamp: Date.now() });
    eventBus.emit('*', { event, payload, timestamp: Date.now() });
}

globalThis.broadcast = broadcast;

// Subbots: sesión propia en subbots/<id>/auth. El bot principal sigue usando Session/.
const sDir = esSubbot ? path.join(CARPETA_SUBBOT, 'auth') : path.join(__dirname, 'Session');

const mStore = new LRUCache<string, any>({
    max: 1000,
    ttl: 1000 * 60 * 5
});

const httpAgent = new Agent.Agent({
    keepAlive: true,
    maxSockets: 100,
    keepAliveMsecs: 15000,
    scheduling: 'fifo'
});

const methodCodeQR = process.argv.includes("--qr");
// Subbot que se vincula con QR (lo pide el panel de la página)
const subbotQR = Boolean(process.env.AKAME_SUBBOT_ID) && process.env.AKAME_SUBBOT_METODO === 'qr';
const methodCode = process.argv.includes("code");

function normalizePhone(input: any) {
    let s = String(input).replace(/\D/g, '');
    if (!s) return '';
    if (s.startsWith('0')) s = s.replace(/^0+/, '');
    if (s.length === 10 && s.startsWith('3')) s = '57' + s;
    if (s.startsWith('52') && !s.startsWith('521') && s.length >= 12) s = '521' + s.slice(2);
    if (s.startsWith('54') && !s.startsWith('549') && s.length >= 11) s = '549' + s.slice(2);
    return s;
}

const limpiarSesion = () => {
    if (fs.existsSync(sDir)) {
        try {
            fs.rmSync(sDir, { recursive: true, force: true });
        } catch {}
    }
};

async function cargarPlugins(dir = './commands') {
    const cmdDir = path.resolve(__dirname, dir);
    if (!fs.existsSync(cmdDir)) return;

    const newPlugins: Record<string, any> = {};

    async function getAllFiles(directory: string): Promise<string[]> {
        const entries = await fsPromises.readdir(directory, { withFileTypes: true });
        const files = await Promise.all(entries.map(e => {
            const res = join(directory, e.name);
            return e.isDirectory() ? getAllFiles(res) : Promise.resolve([res]);
        }));
        return files.flat();
    }

    try {
        const allFiles = await getAllFiles(cmdDir);
        const files = allFiles.filter(f => 
            (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts')
        );

        const ts = Date.now();

        await Promise.all(
            files.map(async (fullPath) => {
                try {
                    const fileUrl = pathToFileURL(fullPath).href;
                    const cmdModule = await import(`${fileUrl}?update=${ts}`);
                    const plugin = cmdModule.default?.default || cmdModule.default || cmdModule;
                    const pluginName = path.basename(fullPath);
                    newPlugins[pluginName] = plugin;
                } catch (err: any) {
                    // Antes este catch estaba vacío: un comando con un error de sintaxis
                    // o un import roto desaparecía del bot sin dejar ni una línea en el log.
                    console.error(chalk.red(`[ PLUGIN ] No se pudo cargar ${path.basename(fullPath)}:`), err?.message || err);
                }
            })
        );

        globalThis.plugins = newPlugins;
        console.log(chalk.green(`[ PLUGIN ] ${Object.keys(newPlugins).length} comandos cargados en ${Date.now() - ts} ms`));
        broadcast('plugins_loaded', { count: Object.keys(newPlugins).length });
    } catch (e) {
        console.error(chalk.red('[ ERROR ] Error al cargar plugins:'), e);
        broadcast('plugins_error', { error: String(e) });
    }
}

const askQuestion = async (query: string): Promise<string> => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(query, (ans) => {
            rl.close();
            resolve(ans.trim());
        });
    });
};

const displayLoadingMessage = () => {
    console.log(chalk.bold.white(`\n\nPor favor, Ingrese el número de WhatsApp.\n` +
        `${chalk.bold.cyan("Ejemplo: +521XXXXXXXXXX")}\n` +
        `${chalk.bold.white('---> ')} `));
};

// Subbots: el código de vinculación se pide una sola vez por proceso
let codigoSubbotPedido = false;
let intentosCodigoSubbot = 0;

async function startBot() {
    await loadDB();
    if (esSubbot) {
        aplicarPerfil();
    } else {
        const prefijoGuardado = leerPrefijo();
        if (prefijoGuardado !== undefined) {
            (global as any).db.data.settings = { ...((global as any).db.data.settings || {}), globalPrefix: prefijoGuardado };
        }
    }
    await cargarPlugins('./commands');

    if (!fs.existsSync(sDir)) {
        fs.mkdirSync(sDir, { recursive: true });
    }

    let { state, saveCreds } = await useMultiFileAuthState(sDir);
    const { version } = await fetchLatestBaileysVersion();

    let opcion: string = '';
    let usarCodigo: boolean = false;

    if (esSubbot && !state.creds.registered && SUBBOT_MODO === 'restaurar') {
        // Sin sesión guardada no hay nada que restaurar: el padre lo borra
        reportar({ tipo: 'desvinculado' });
        process.exit(0);
    }

    if (!state.creds.registered && esSubbot) {
        // Subbot nuevo: la vinculación la pide lib/subbots.ts, sin preguntas en consola
        usarCodigo = SUBBOT_MODO === 'vincular' && !subbotQR;
        fs.mkdirSync(sDir, { recursive: true });
        const reloadedAuth = await useMultiFileAuthState(sDir);
        state = reloadedAuth.state;
        saveCreds = reloadedAuth.saveCreds;
    } else if (!state.creds.registered) {
        console.log(chalk.cyan(`
      AKAME-MD
     Powered by LORD GUS 
`));

        if (methodCodeQR) {
            opcion = '1';
        } else if (methodCode) {
            opcion = '2';
            usarCodigo = true;
        } else {
            let lineM = '⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ ⋯ 》';
            console.log(chalk.white(`╭${lineM}`));
            opcion = await askQuestion(
                `┊ ${chalk.bold.cyan(' METODO DE VINCULACION ')}\n` +
                `┊ ${chalk.bold.white('⇢ Opcion 1:')} ${chalk.cyan('Codigo QR.')}\n` +
                `┊ ${chalk.bold.white('⇢ Opcion 2:')} ${chalk.cyan('Codigo de 8 digitos.')}\n` +
                `╰${lineM}\n${chalk.bold.white('---> ')}`
            );
            usarCodigo = opcion === "2";
        }

        limpiarSesion();
        fs.mkdirSync(sDir, { recursive: true });

        const reloadedAuth = await useMultiFileAuthState(sDir);
        state = reloadedAuth.state;
        saveCreds = reloadedAuth.saveCreds;
    }

    const esQR = opcion === '1' || methodCodeQR || subbotQR;

    const sock = makeWASocket({
        logger: P({ level: 'silent' }) as any,
        printQRInTerminal: false,
        version,
        browser: esSubbot ? Browsers.windows('Chrome') : Browsers.macOS('Safari'),
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' }) as any)
        },
        markOnlineOnConnect: false,
        emitOwnEvents: false,
        generateHighQualityLinkPreview: false,
        syncFullHistory: false,
        downloadHistory: false,
        fireInitQueries: false,
        keepAliveIntervalMs: 30000,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: undefined,
        retryRequestDelayMs: 250,
        getMessage: async () => undefined,
        fetchOpts: { agent: httpAgent } as any
    });

    // Subbots: recordar los mensajes que envía el propio subbot para no responderse a sí mismo
    const enviadosPorBot = new Set<string>();
    if (esSubbot) {
        const enviarOriginal = (sock as any).sendMessage.bind(sock);
        (sock as any).sendMessage = async (...args: any[]) => {
            const r: any = await enviarOriginal(...args);
            if (r?.key?.id) {
                enviadosPorBot.add(r.key.id);
                if (enviadosPorBot.size > 500) enviadosPorBot.delete(enviadosPorBot.values().next().value as string);
            }
            return r;
        };
    }

    if (esSubbot) {
        // La vinculación del subbot se pide en connection.update (ver abajo)
    } else if (usarCodigo && !state.creds.registered) {
        displayLoadingMessage();
        let num = await askQuestion('');
        num = normalizePhone(num);

        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(num);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.white.bgBlue(` CODIGO DE VINCULACION `), chalk.white(`: ${code}`));
                broadcast('pairing_code', { code });
            } catch (err) {
                console.log(chalk.red('[ ERROR ] Falla al generar código de vinculación:'), err);
                limpiarSesion();
                setTimeout(() => startBot(), 2000);
            }
        }, 3000);
    }

    usarSockPanel(sock);
    sock.ev.on('creds.update', async () => {
        await saveCreds();
    });

    sock.ev.on('group-participants.update', async (update) => {
        const { id, action } = update;
        invalidateGroupCache(id);
        broadcast('group_updated', { chatId: id, action });
        await bienvenidaSubbot(sock, update);
        await handleGroupParticipants(sock, update);
        revisarIngreso(sock, update).catch(() => {});
    });

    sock.ev.on('groups.update', async (updates) => {
        await handleGroupAlerts(sock, updates);
    });

    sock.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect, qr } = u;

        if (esSubbot && connection === 'connecting' && usarCodigo && !state.creds.registered && !codigoSubbotPedido) {
            codigoSubbotPedido = true;
            // Esperamos a que el socket esté abierto; si se cierra antes, la siguiente conexión lo reintenta
            setTimeout(async () => {
                try {
                    // Código personalizado (AKAMEMD+letra) si lo asignó el bot; si no, uno aleatorio
                    const personalizado = process.env.AKAME_SUBBOT_CODIGO || '';
                    const raw: string = await sock.requestPairingCode(leerPerfil().numero, personalizado.length === 8 ? personalizado : undefined);
                    const codigo = personalizado.length === 8 ? raw : (raw?.match(/.{1,4}/g)?.join('-') ?? raw);
                    intentosCodigoSubbot = 0;
                    reportar({ tipo: 'codigo', codigo });
                } catch (err: any) {
                    codigoSubbotPedido = false;
                    intentosCodigoSubbot++;
                    if (intentosCodigoSubbot >= 5) {
                        reportar({ tipo: 'error', motivo: `No se pudo generar el código: ${err?.message || 'error'}` });
                        setTimeout(() => process.exit(1), 300);
                    }
                }
            }, 2500);
        }

        if (qr && subbotQR) {
            // El bot principal recibe la imagen y la muestra en la página
            try {
                const imagen = await qrcode.toDataURL(qr, { margin: 2, width: 512 });
                reportar({ tipo: 'qr', qr: imagen });
            } catch {}
        }

        if (qr && esQR) {
            try {
                const qrTerminal = await qrcode.toString(qr, { type: 'terminal', small: true });
                console.log(chalk.bold.cyan('\n[ QR ] ESCANEA EL SIGUIENTE CÓDIGO QR:\n'));
                console.log(qrTerminal);
                broadcast('qr_generated', { qr });
            } catch (err) {
                console.log(chalk.red('[ ERROR ] Error al renderizar el código QR:'), err);
            }
        }

        if (connection === 'open') {
            (global as any).mainConn = sock;
            console.log(chalk.bold.cyan(`\n✿ ${globalThis.botName} conectado y listo ✰\n`));
            broadcast('bot_status', { status: 'connected', botName: globalThis.botName });
            if (esSubbot) {
                reportar({ tipo: 'conectado' });
            } else {
                avisarReinicio(sock);
                restaurarSubbots();
                iniciarVincularWeb();
            }
        }

        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const isStreamError = lastDisconnect?.error?.message?.includes('Stream Errored');
            broadcast('bot_status', { status: 'disconnected', statusCode });

            if (statusCode === 515 || isStreamError) {
                console.log(chalk.yellow('[ RECONNECT ] Reiniciando socket por actualización de sesión...'));
                setTimeout(() => startBot(), 2000);
            } else if (statusCode === DisconnectReason.loggedOut && esSubbot) {
                reportar({ tipo: 'desvinculado' });
                setTimeout(() => process.exit(0), 500);
            } else if (statusCode === DisconnectReason.loggedOut) {
                console.log(chalk.red('[ SESSION ] Sesión cerrada desde el teléfono. Limpiando...'));
                limpiarSesion();
                setTimeout(() => startBot(), 2000);
            } else {
                console.log(chalk.yellow(`[ CONEXION ] Desconectado (Status ${statusCode}). Reintentando...`));
                setTimeout(() => startBot(), 3000);
            }
        }
    });

    sock.ev.on('messages.upsert', ({ messages, type }) => {
        if (type !== 'notify') return;

        const len = messages.length;
        const serializedCache = new Map();

        for (let i = 0; i < len; i++) {
            const rawMsg = messages[i];
            const mId = rawMsg?.key?.id;
            if (!mId || !rawMsg.message) continue;

            const jid = rawMsg.key.remoteJid || '';
            if (jid === 'status@broadcast' || jid.endsWith('@broadcast')) continue;

            if (mStore.has(mId)) continue;
            mStore.set(mId, true);

            // Grupos: AntiDelete (reenvía lo borrado), AntiVer (reenvía "ver una vez")
            if (jid.endsWith('@g.us')) {
                if (rawMsg.message.protocolMessage) {
                    procesarRevocacion(sock, rawMsg).catch(() => {});
                    continue;
                }
                guardarParaAntidelete(rawMsg);
                recordarNombre(rawMsg);
                procesarVerUnaVez(sock, rawMsg).catch(() => {});
            }

            // Subbot: primero sus comandos de personalización (.setnombre, .perfil, ...)
            if (esSubbot && rawMsg.key.fromMe && enviadosPorBot.has(mId)) continue;
            // Subbot: apagado o solo-dueño por grupo (.apagar / .encender)
            if (esSubbot && filtrarGrupo(sock, rawMsg)) continue;
            if (esSubbot && manejarPersonal(sock, rawMsg)) continue;

            const msg = serialize(sock, rawMsg);
            if (!msg) continue;

            serializedCache.set(mId, msg);

            handler(sock, rawMsg, msg).catch(() => {});

            queueMicrotask(() => {
                const cachedMsg = serializedCache.get(mId) || msg;
                printMessageLog(cachedMsg, sock).catch(() => {});
                broadcast('message_received', {
                    id: mId,
                    jid,
                    pushName: rawMsg.pushName,
                    body: cachedMsg.body?.substring(0, 100) || ''
                });
            });
        }

        if (serializedCache.size > 0) {
            queueMicrotask(() => {
                serializedCache.clear();
            });
        }
    });

    const commandsPath = path.join(__dirname, 'commands');
    if (fs.existsSync(commandsPath)) {
        const reloadCommandsDebounced = debounce(() => {
            cargarPlugins('./commands').catch(() => {});
        }, 300);

        fs.watch(commandsPath, { recursive: true }, (_, filename) => {
            if (filename && (filename.endsWith('.ts') || filename.endsWith('.js'))) {
                reloadCommandsDebounced();
            }
        });
    }
}

// Si el proceso principal se cae, el subbot también se cierra
if (esSubbot) process.on('disconnect', () => process.exit(0));

startBot().catch(() => {});

const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

const filterNoise = (chunk: any, encoding?: any, callback?: any) => {
    const str = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
    
    if (
        str.includes('Closing open session') ||
        str.includes('Closing session') ||
        str.includes('SessionEntry') ||
        str.includes('ephemeralKeyPair') ||
        str.includes('currentRatchet') ||
        str.includes('prekey bundle') ||
        str.includes('chainKey') ||
        str.includes('registrationId') ||
        str.includes('bad-mac') ||
        str.includes('Bad MAC') ||
        str.includes('Failed to decrypt') ||
        str.includes('Session error') ||
        str.includes('Session error:') ||
        str.includes('Error: bad-mac')
    ) {
        if (typeof callback === 'function') callback();
        return true;
    }
    
    return originalStdoutWrite(chunk, encoding, callback);
};

process.stdout.write = filterNoise as any;
process.stderr.write = filterNoise as any;

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});
process.on('uncaughtExceptionMonitor', () => {});