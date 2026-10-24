import crypto from 'node:crypto';
import { fork, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Gestor de subbots (proceso principal).
 * Cada subbot corre el mismo index.ts en modo subbot, con su carpeta en subbots/<id>.
 * Estados: emparejando → conectado; conectado → caido (se reintenta) o pausado (.stop).
 */

export const CUPO_DEFECTO = 20;
const CUPO_MIN = 1;
const CUPO_MAX = 100;
const TIEMPO_VINCULAR_MS = 90_000;
const TIEMPO_QR_MS = 150_000; // el QR se renueva cada ~20 s; hay tiempo para escanear
const ESPERA_CODIGO_MS = 25_000;
const ESPERA_ENTRE_CODIGOS_MS = 60_000;
const MAX_REINTENTOS = 5;

const RAIZ = path.join(process.cwd(), 'subbots');
const REGISTRO = path.join(RAIZ, 'registro.json');
const CUPO_ARCHIVO = path.join(RAIZ, 'cupo.json');
const ENTRADA = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.ts');

// Mismos flags que scripts/lanzar.mjs, para que el subbot corra TypeScript directo
const [MAJ, MIN] = process.versions.node.split('.').map(Number);
const alMenos = (a: number, b: number) => MAJ > a || (MAJ === a && MIN >= b);
const EXEC_ARGV = [
    '--disable-warning=ExperimentalWarning',
    ...(alMenos(22, 18) || alMenos(23, 6) ? [] : ['--experimental-strip-types'])
];

export type EstadoSubbot = 'emparejando' | 'conectado' | 'caido' | 'pausado';

export interface Subbot {
    id: string;
    numero: string;
    estado: EstadoSubbot;
    codigo?: string;
    creado: string;
    chat?: string; // chat donde se pidió el código (aquí se avisa cuando se conecta)
}

interface Vivo {
    proc: ChildProcess;
    timer?: NodeJS.Timeout;
    reintentos: number;
    apagando: boolean;
}

const vivos = new Map<string, Vivo>();
const ultimoCodigo = new Map<string, number>(); // número → última vez que recibió código

fs.mkdirSync(RAIZ, { recursive: true });

const leerJSON = <T>(archivo: string, defecto: T): T => {
    try { return JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch { return defecto; }
};

const leerRegistro = (): Subbot[] => leerJSON<Subbot[]>(REGISTRO, []);
const guardarRegistro = (lista: Subbot[]) => fs.writeFileSync(REGISTRO, JSON.stringify(lista, null, 2));

const cambiar = (id: string, cambios: Partial<Subbot>) => {
    const lista = leerRegistro();
    const i = lista.findIndex((s) => s.id === id);
    if (i !== -1) {
        lista[i] = { ...lista[i], ...cambios };
        guardarRegistro(lista);
    }
};

const soloDigitos = (n: string) => String(n || '').replace(/\D/g, '');

// ---------- Cupo ----------

export const getCupo = (): number => {
    const n = Number(leerJSON<{ max?: number }>(CUPO_ARCHIVO, {}).max);
    return Number.isInteger(n) && n >= CUPO_MIN && n <= CUPO_MAX ? n : CUPO_DEFECTO;
};

/** Cambia el cupo. Bajarlo no apaga subbots existentes; solo bloquea nuevos. */
export const setCupo = (n: number) => {
    if (!Number.isInteger(n) || n < CUPO_MIN || n > CUPO_MAX) {
        throw new Error(`El cupo debe ser un número entre ${CUPO_MIN} y ${CUPO_MAX}`);
    }
    fs.writeFileSync(CUPO_ARCHIVO, JSON.stringify({ max: n }, null, 2));
    return n;
};

// ---------- Consulta ----------

/** Todos los subbots registrados (cuentan para el cupo). */
export const listarSubbots = (): Subbot[] => leerRegistro();

/** Los que se muestran en la lista: los conectados y los que esperan vincularse. */
export const listarVisibles = (): Subbot[] =>
    leerRegistro().filter((s) => s.estado === 'conectado' || s.estado === 'emparejando');

export const buscarSubbot = (idONumero: string): Subbot | undefined => {
    const clave = String(idONumero || '').trim();
    const digitos = soloDigitos(clave);
    return leerRegistro().find((s) => s.id === clave || (digitos && s.numero === digitos));
};

/** Segundos que faltan para poder pedir otro código con este número (0 si ya puede). */
export const esperaCodigo = (numero: string): number => {
    const t = ultimoCodigo.get(soloDigitos(numero));
    if (!t) return 0;
    return Math.max(0, Math.ceil((t + ESPERA_ENTRE_CODIGOS_MS - Date.now()) / 1000));
};

/** Sesión guardada con la cuenta ya vinculada (sin esto no se puede reactivar). */
const sesionVinculada = (id: string): boolean => {
    const creds = leerJSON<{ registered?: boolean }>(path.join(RAIZ, id, 'auth', 'creds.json'), {});
    return creds.registered === true;
};

// ---------- Procesos ----------

const notificarConexion = (entrada: Subbot) => {
    const sock = (global as any).mainConn;
    if (!sock || !entrada.chat) return;
    const texto = [
        '˚₊· ͟͟͞͞➳❥ *NUEVO SUBBOT CONECTADO*',
        '───────────────',
        `✧ Número » +${entrada.numero}`,
        '✦ Ya puede usar sus comandos',
        '───────────────',
        '> AKAME-MD 🌸'
    ].join('\n');
    sock.sendMessage(entrada.chat, { text: texto }).catch(() => {});
};

/** Código de vinculación personalizado: AKAMEMD + 1 letra (8 caracteres, sin I L O U). */
const PREFIJO_CODIGO = 'AKAMEMD';
const LETRAS_CODIGO = 'VWXYZABCDEFGHJKMNPQRST';
const elegirCodigo = (lista: any[]): string => {
    const usados = new Set(lista.map((s) => s.codigo).filter(Boolean));
    const libre = [...LETRAS_CODIGO].find((l) => !usados.has(PREFIJO_CODIGO + l));
    if (!libre) throw new Error('No hay códigos disponibles en este momento, intenta más tarde');
    return PREFIJO_CODIGO + libre;
};

const lanzarWorker = (id: string, modo: 'vincular' | 'restaurar', metodo: 'codigo' | 'qr' = 'codigo'): ChildProcess => {
    const proc = fork(ENTRADA, [], {
        execArgv: EXEC_ARGV,
        cwd: process.cwd(),
        stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
        env: {
            ...process.env,
            AKAME_SUBBOT_ID: id,
            AKAME_SUBBOT_MODO: modo,
            AKAME_SUBBOT_METODO: metodo,
            AKAME_SUBBOT_CODIGO: leerRegistro().find((s) => s.id === id)?.codigo || '',
            AKAME_DB_PATH: path.join(RAIZ, id, 'database.db')
        }
    });
    const previo = vivos.get(id);
    vivos.set(id, { proc, reintentos: previo?.reintentos ?? 0, apagando: false, timer: previo?.timer });

    proc.on('message', (m: any) => {
        if (m?.tipo === 'conectado') {
            const v = vivos.get(id);
            if (v) { clearTimeout(v.timer); v.reintentos = 0; }
            const antes = leerRegistro().find((s) => s.id === id);
            cambiar(id, { estado: 'conectado' });
            if (antes?.estado === 'emparejando' && antes.chat) {
                notificarConexion({ ...antes, estado: 'conectado' });
            }
            console.log(`[SUBBOT ${id}] conectado`);
        }
        if (m?.tipo === 'pausar') {
            // Lo pidió el dueño con .stop: el proceso se cierra y no se vuelve a levantar
            const v = vivos.get(id);
            if (v) { v.apagando = true; clearTimeout(v.timer); }
            cambiar(id, { estado: 'pausado' });
            console.log(`[SUBBOT ${id}] pausado por su dueño`);
        }
        if (m?.tipo === 'desvinculado') {
            console.log(`[SUBBOT ${id}] desvinculado desde WhatsApp, se borra`);
            borrarSubbot(id);
        }
    });

    proc.on('exit', () => {
        const v = vivos.get(id);
        if (!v || v.apagando) return;
        vivos.delete(id);
        const entrada = leerRegistro().find((s) => s.id === id);
        if (!entrada) return;
        if (entrada.estado === 'emparejando') {
            borrarSubbot(id); // nunca llegó a vincularse
            return;
        }
        cambiar(id, { estado: 'caido' });
        if (v.reintentos >= MAX_REINTENTOS) {
            console.log(`[SUBBOT ${id}] caído varias veces, queda pendiente de .reactivar`);
            return;
        }
        console.log(`[SUBBOT ${id}] caído, reintento ${v.reintentos + 1}/${MAX_REINTENTOS} en 10 s`);
        setTimeout(() => {
            if (!fs.existsSync(path.join(RAIZ, id))) return;
            if (leerRegistro().find((s) => s.id === id)?.estado !== 'caido') return;
            const previo = vivos.get(id);
            lanzarWorker(id, 'restaurar');
            const nuevo = vivos.get(id);
            if (nuevo) nuevo.reintentos = (previo?.reintentos ?? v.reintentos) + 1;
        }, 10_000);
    });

    return proc;
};

/** Apaga el proceso de un subbot y borra su carpeta y su registro. */
export const borrarSubbot = (id: string) => {
    const v = vivos.get(id);
    if (v) {
        v.apagando = true;
        clearTimeout(v.timer);
        try { v.proc.kill(); } catch {}
        vivos.delete(id);
    }
    fs.rmSync(path.join(RAIZ, id), { recursive: true, force: true });
    guardarRegistro(leerRegistro().filter((s) => s.id !== id));
};

/**
 * Vuelve a encender un subbot pausado o caído. Devuelve:
 * 'ok' si arrancó, 'cerrada' si la sesión ya no existe (se borra), 'activo' si ya estaba encendido.
 */
export const reactivarSubbot = (id: string): 'ok' | 'cerrada' | 'activo' | 'pendiente' => {
    const entrada = leerRegistro().find((s) => s.id === id);
    if (!entrada) return 'cerrada';
    if (entrada.estado === 'conectado') return 'activo';
    if (entrada.estado === 'emparejando') return 'pendiente';
    if (vivos.has(id) && entrada.estado !== 'pausado') return 'activo';
    if (!sesionVinculada(id)) {
        borrarSubbot(id);
        return 'cerrada';
    }
    cambiar(id, { estado: 'caido' });
    vivos.delete(id);
    lanzarWorker(id, 'restaurar');
    vivos.get(id)!.reintentos = 0;
    return 'ok';
};

/** Al arrancar el bot principal: vuelve a levantar los subbots vinculados que no estaban pausados. */
export const restaurarSubbots = () => {
    const lista = leerRegistro();
    let levantados = 0;
    for (const s of lista) {
        if (!fs.existsSync(path.join(RAIZ, s.id))) {
            guardarRegistro(leerRegistro().filter((x) => x.id !== s.id));
            continue;
        }
        if (s.estado === 'pausado' || vivos.has(s.id)) continue;
        lanzarWorker(s.id, 'restaurar');
        levantados++;
    }
    if (levantados) console.log(`[SUBBOTS] restaurando ${levantados} subbot(s)`);
};

/**
 * Crea un subbot para un número y devuelve el código de vinculación.
 * `chat` es donde se pidió el código: ahí se avisa cuando se conecte.
 * Lanza error si el número no es válido, ya tiene subbot o no hay cupo.
 */
export interface PerfilInicial { nombre?: string; prefijo?: string; banner?: string }

export const crearSubbot = async (
    numero: string,
    chat?: string,
    personal?: PerfilInicial,
    metodo: 'codigo' | 'qr' = 'codigo',
    onQr?: (qr: string) => void
): Promise<{ id: string; codigo: string; qr?: string }> => {
    const num = soloDigitos(numero);
    if (num.length < 8 || num.length > 15) {
        throw new Error('Número inválido. Usa el formato con código de país, ej. 51999999999');
    }

    let lista = leerRegistro();
    const previo = lista.find((s) => s.numero === num);
    if (previo) {
        // Si ya quedó vinculado, no se toca. Si nunca llegó a vincularse (intento viejo), se limpia y se sigue.
        if (previo.estado === 'conectado' || sesionVinculada(previo.id)) {
            throw new Error('Ese número ya tiene un subbot vinculado. Usa .reactivar o bórralo desde WhatsApp');
        }
        borrarSubbot(previo.id);
        lista = leerRegistro();
    }
    if (lista.length >= getCupo()) throw new Error(`No hay cupo disponible (${getCupo()} subbots)`);

    const codigo = elegirCodigo(lista);
    const id = `sb-${Date.now().toString(36)}`;
    const carpeta = path.join(RAIZ, id);
    fs.mkdirSync(carpeta, { recursive: true });
    // Datos que puso la persona en la página (ya validados); si no hay, valores por defecto
    const nombre = (personal?.nombre || '').trim().slice(0, 30) || 'AKAME Subbot';
    const prefijo = /^[^\p{L}\p{N}\s]{1,2}$/u.test(personal?.prefijo || '') ? personal!.prefijo! : '.';
    const banner = /^https?:\/\//i.test(personal?.banner || '') ? personal!.banner! : '';
    fs.writeFileSync(path.join(carpeta, 'perfil.json'), JSON.stringify({
        numero: num,
        nombre,
        prefijo,
        banner,
        bienvenida: ''
    }, null, 2));
    guardarRegistro([...lista, { id, numero: num, estado: 'emparejando', creado: new Date().toISOString(), chat, codigo }]);

    return new Promise((resolver, rechazar) => {
        const proc = lanzarWorker(id, 'vincular', metodo);
        const v = vivos.get(id)!;
        let listo = false;

        const fallar = (motivo: string) => {
            if (listo) return;
            listo = true;
            borrarSubbot(id);
            rechazar(new Error(motivo));
        };

        const espera = setTimeout(() => fallar('WhatsApp no respondió a tiempo, intenta de nuevo'), ESPERA_CODIGO_MS);

        proc.on('message', (m: any) => {
            // QR: cada imagen nueva se avisa con onQr; la primera resuelve la petición
            if (m?.tipo === 'qr') {
                if (onQr) onQr(String(m.qr));
                if (!listo) {
                    listo = true;
                    clearTimeout(espera);
                    ultimoCodigo.set(num, Date.now());
                    v.timer = setTimeout(() => {
                        if (leerRegistro().find((s) => s.id === id)?.estado !== 'conectado') {
                            console.log(`[SUBBOT ${id}] no vinculado a tiempo, se borra`);
                            borrarSubbot(id);
                        }
                    }, TIEMPO_QR_MS);
                    resolver({ id, codigo: '', qr: String(m.qr) });
                }
                return;
            }
            if (listo) return;
            if (m?.tipo === 'codigo') {
                listo = true;
                clearTimeout(espera);
                ultimoCodigo.set(num, Date.now());
                // Si no se vincula en 90 s, se borra
                v.timer = setTimeout(() => {
                    if (leerRegistro().find((s) => s.id === id)?.estado !== 'conectado') {
                        console.log(`[SUBBOT ${id}] no vinculado a tiempo, se borra`);
                        borrarSubbot(id);
                    }
                }, TIEMPO_VINCULAR_MS);
                resolver({ id, codigo: m.codigo });
            }
            if (m?.tipo === 'error') fallar(m.motivo || 'No se pudo generar el código');
        });
        proc.on('exit', (code, signal) => fallar(`El subbot se cerró antes de generar el código (${signal ? 'señal ' + signal : 'salida ' + code})`));
    });
};

// ---------------------------------------------------------------------------
// Panel web del dueño: el bot principal le pide cosas al subbot por IPC.
// Cada pedido tiene un id (req) y el subbot responde con { tipo: 'panel_resp', req, ... }.
// ---------------------------------------------------------------------------
const pedirAlSubbot = (id: string, mensaje: Record<string, unknown>, esperaMs: number): Promise<any> => {
    return new Promise((resolver, rechazar) => {
        const v = vivos.get(id);
        if (!v || !v.proc.connected) return rechazar(new Error('Tu subbot no está encendido'));

        const req = crypto.randomUUID();
        const proc = v.proc;
        const fin = () => proc.off('message', alRecibir);
        const alRecibir = (m: any) => {
            if (m?.tipo !== 'panel_resp' || m.req !== req) return;
            clearTimeout(tiempo);
            fin();
            if (m.error) rechazar(new Error(String(m.error)));
            else resolver(m);
        };
        const tiempo = setTimeout(() => {
            fin();
            rechazar(new Error('Tu subbot no respondió a tiempo, intenta de nuevo'));
        }, esperaMs);

        proc.on('message', alRecibir);
        proc.send({ ...mensaje, req });
    });
};

/** Envía el código del panel al número del dueño (por WhatsApp, desde su subbot). */
export const panelEnviarCodigo = (id: string, codigo: string) =>
    pedirAlSubbot(id, { tipo: 'panel_codigo', codigo }, 20000);

/** Lista de grupos del subbot con su configuración actual. */
export const panelGrupos = async (id: string): Promise<{ grupos: any[]; perfil: any }> => {
    const m = await pedirAlSubbot(id, { tipo: 'pedir_grupos' }, 25000);
    return { grupos: Array.isArray(m.grupos) ? m.grupos : [], perfil: m.perfil || null };
};

/** Cambia nombre, prefijo o banner del subbot (se aplica al momento). */
export const panelPerfil = (id: string, perfil: Record<string, unknown>) =>
    pedirAlSubbot(id, { tipo: 'panel_perfil', perfil }, 20000);

/** Aplica cambios: { "<jid>": { responde?, antilink?, antitoxic?, antispam?, antispamCfg? } } */
export const panelAplicar = (id: string, cambios: Record<string, unknown>) =>
    pedirAlSubbot(id, { tipo: 'panel_aplicar', cambios }, 25000);
