import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import P from 'pino';
import fs from 'fs';
import path from 'path';

/**
 * Gestor de subbots (etapa 1: local).
 * Cada subbot es una sesión de Baileys con su propia carpeta en subbots/<id>.
 * Límites: MAX_SUBBOTS en total y un subbot por número.
 */

export const MAX_SUBBOTS = 5;
const TIMEOUT_VINCULAR_MS = 90_000;
const RAIZ = path.resolve(process.cwd(), 'subbots');
const REGISTRO = path.join(RAIZ, 'registro.json');

export type EstadoSubbot = 'emparejando' | 'conectado' | 'caido' | 'expirado';

export interface Subbot {
    id: string;
    numero: string;
    estado: EstadoSubbot;
    creado: string;
}

type Vivo = { sock: any; timer?: NodeJS.Timeout };
const vivos = new Map<string, Vivo>();

fs.mkdirSync(RAIZ, { recursive: true });

const leerRegistro = (): Subbot[] => {
    try { return JSON.parse(fs.readFileSync(REGISTRO, 'utf8')); } catch { return []; }
};

const guardarRegistro = (lista: Subbot[]) => {
    fs.writeFileSync(REGISTRO, JSON.stringify(lista, null, 2));
};

const actualizar = (id: string, cambios: Partial<Subbot>) => {
    const lista = leerRegistro();
    const i = lista.findIndex((s) => s.id === id);
    if (i !== -1) lista[i] = { ...lista[i], ...cambios };
    guardarRegistro(lista);
};

const soloDigitos = (n: string) => String(n || '').replace(/\D/g, '');

export const listarSubbots = (): Subbot[] => leerRegistro();

/** Cierra el socket y, si se pide, borra la carpeta de credenciales. */
export const apagarSubbot = (id: string, borrarCarpeta: boolean) => {
    const v = vivos.get(id);
    if (v) {
        clearTimeout(v.timer);
        try { v.sock.end(undefined); } catch {}
        vivos.delete(id);
    }
    if (borrarCarpeta) fs.rmSync(path.join(RAIZ, id), { recursive: true, force: true });
};

/** Quita un subbot por completo: socket, carpeta y registro. */
export const borrarSubbot = (id: string) => {
    apagarSubbot(id, true);
    guardarRegistro(leerRegistro().filter((s) => s.id !== id));
};

/**
 * Crea un subbot y devuelve el código de emparejamiento.
 * Lanza error si hay cupo lleno o el número ya tiene uno.
 */
export const crearSubbot = async (numero: string): Promise<{ id: string; codigo: string }> => {
    const num = soloDigitos(numero);
    if (num.length < 8) throw new Error('Número inválido. Usa el formato con código de país, ej. 51999999999');

    const lista = leerRegistro();
    if (lista.some((s) => s.numero === num && s.estado !== 'expirado')) {
        throw new Error('Ese número ya tiene un subbot');
    }
    if (lista.filter((s) => s.estado !== 'expirado').length >= MAX_SUBBOTS) {
        throw new Error(`Cupo lleno (${MAX_SUBBOTS} subbots)`);
    }

    const id = `sb-${Date.now().toString(36)}`;
    const carpeta = path.join(RAIZ, id);
    const creado = new Date().toISOString();
    guardarRegistro([...lista, { id, numero: num, estado: 'emparejando', creado }]);

    const { state, saveCreds } = await useMultiFileAuthState(carpeta);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: Browsers.macOS('Safari'),
        logger: P({ level: 'silent' }) as any,
        markOnlineOnConnect: false,
        syncFullHistory: false,
        downloadHistory: false,
        fireInitQueries: false,
        keepAliveIntervalMs: 30000,
        getMessage: async () => undefined
    });

    const vivo: Vivo = { sock };
    vivos.set(id, vivo);

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
        if (connection === 'open') {
            clearTimeout(vivo.timer);
            actualizar(id, { estado: 'conectado' });
            console.log(`[SUBBOT ${id}] conectado`);
        }
        if (connection === 'close') {
            const codigo = (lastDisconnect?.error as any)?.output?.statusCode;
            if (codigo === DisconnectReason.loggedOut) {
                // El usuario desvinculó el dispositivo: limpiar todo
                console.log(`[SUBBOT ${id}] desvinculado, se borra`);
                borrarSubbot(id);
            } else {
                actualizar(id, { estado: 'caido' });
                console.log(`[SUBBOT ${id}] caído (${codigo ?? 'sin código'})`);
            }
        }
    });

    // Igual que el bot principal: esperar un poco antes de pedir el código
    await new Promise((r) => setTimeout(r, 3000));
    if (state.creds.registered) throw new Error('La sesión ya estaba registrada');

    let codigo: string;
    try {
        const raw: string = await sock.requestPairingCode(num);
        codigo = raw?.match(/.{1,4}/g)?.join('-') ?? raw;
    } catch (e: any) {
        borrarSubbot(id);
        throw new Error(`No se pudo generar el código: ${e?.message || 'error'}`);
    }

    // Si no se vincula a tiempo, se libera el cupo
    vivo.timer = setTimeout(() => {
        const sesion = leerRegistro().find((s) => s.id === id);
        if (sesion && sesion.estado !== 'conectado') {
            console.log(`[SUBBOT ${id}] no vinculado a tiempo, se borra`);
            borrarSubbot(id);
        }
    }, TIMEOUT_VINCULAR_MS);

    return { id, codigo };
};
