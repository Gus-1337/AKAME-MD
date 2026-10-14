import { fork, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Gestor de subbots (proceso principal).
 * Cada subbot corre en su propio proceso (subbot/worker.ts) con su carpeta en subbots/<id>.
 * El cupo lo cambia el owner con .subbots max <n> (por defecto 20).
 */

export const CUPO_DEFECTO = 20;
const CUPO_MIN = 1;
const CUPO_MAX = 100;
const TIEMPO_VINCULAR_MS = 90_000;
const ESPERA_CODIGO_MS = 25_000;
const MAX_REINTENTOS = 5;

const RAIZ = path.join(process.cwd(), 'subbots');
const REGISTRO = path.join(RAIZ, 'registro.json');
const CUPO_ARCHIVO = path.join(RAIZ, 'cupo.json');
const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'subbot', 'worker.ts');

// Mismos flags que scripts/lanzar.mjs, para que el worker corra TypeScript directo
const [MAJ, MIN] = process.versions.node.split('.').map(Number);
const alMenos = (a: number, b: number) => MAJ > a || (MAJ === a && MIN >= b);
const EXEC_ARGV = [
    '--disable-warning=ExperimentalWarning',
    ...(alMenos(22, 18) || alMenos(23, 6) ? [] : ['--experimental-strip-types'])
];

export type EstadoSubbot = 'emparejando' | 'conectado' | 'caido';

export interface Subbot {
    id: string;
    numero: string;
    estado: EstadoSubbot;
    creado: string;
}

interface Vivo {
    proc: ChildProcess;
    timer?: NodeJS.Timeout;
    reintentos: number;
    apagando: boolean;
}

const vivos = new Map<string, Vivo>();

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

export const listarSubbots = (): Subbot[] => leerRegistro();

export const buscarSubbot = (idONumero: string): Subbot | undefined => {
    const clave = String(idONumero || '').trim();
    const digitos = soloDigitos(clave);
    return leerRegistro().find((s) => s.id === clave || (digitos && s.numero === digitos));
};

// ---------- Procesos ----------

const perfilDe = (id: string) => leerJSON<Record<string, any>>(path.join(RAIZ, id, 'perfil.json'), {});

const lanzarWorker = (id: string, modo: 'vincular' | 'restaurar'): ChildProcess => {
    const proc = fork(WORKER, [id, modo], {
        execArgv: EXEC_ARGV,
        cwd: process.cwd(),
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        env: process.env
    });
    const previo = vivos.get(id);
    vivos.set(id, { proc, reintentos: previo?.reintentos ?? 0, apagando: false, timer: previo?.timer });

    proc.on('message', (m: any) => {
        if (m?.tipo === 'conectado') {
            const v = vivos.get(id);
            if (v) { clearTimeout(v.timer); v.reintentos = 0; }
            cambiar(id, { estado: 'conectado' });
            console.log(`[SUBBOT ${id}] conectado`);
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
            console.log(`[SUBBOT ${id}] caído varias veces, no se reintenta`);
            return;
        }
        console.log(`[SUBBOT ${id}] caído, reintento ${v.reintentos + 1}/${MAX_REINTENTOS} en 10 s`);
        setTimeout(() => {
            if (!fs.existsSync(path.join(RAIZ, id))) return;
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

/** Al arrancar el bot principal: vuelve a levantar los subbots que ya estaban vinculados. */
export const restaurarSubbots = () => {
    const lista = leerRegistro();
    for (const s of lista) {
        if (!fs.existsSync(path.join(RAIZ, s.id))) {
            guardarRegistro(leerRegistro().filter((x) => x.id !== s.id));
            continue;
        }
        if (vivos.has(s.id)) continue;
        lanzarWorker(s.id, 'restaurar');
    }
    if (lista.length) console.log(`[SUBBOTS] restaurando ${lista.length} subbot(s)`);
};

/**
 * Crea un subbot para un número y devuelve el código de vinculación.
 * Lanza error si el número no es válido, ya tiene subbot o no hay cupo.
 */
export const crearSubbot = async (numero: string): Promise<{ id: string; codigo: string }> => {
    const num = soloDigitos(numero);
    if (num.length < 8 || num.length > 15) {
        throw new Error('Número inválido. Usa el formato con código de país, ej. 51999999999');
    }

    const lista = leerRegistro();
    if (lista.some((s) => s.numero === num)) throw new Error('Ese número ya tiene un subbot');
    if (lista.length >= getCupo()) throw new Error(`No hay cupo disponible (${getCupo()} subbots)`);

    const id = `sb-${Date.now().toString(36)}`;
    const carpeta = path.join(RAIZ, id);
    fs.mkdirSync(carpeta, { recursive: true });
    fs.writeFileSync(path.join(carpeta, 'perfil.json'), JSON.stringify({
        numero: num,
        nombre: 'AKAME Subbot',
        prefijo: '.',
        banner: '',
        bienvenida: ''
    }, null, 2));
    guardarRegistro([...lista, { id, numero: num, estado: 'emparejando', creado: new Date().toISOString() }]);

    return new Promise((resolver, rechazar) => {
        const proc = lanzarWorker(id, 'vincular');
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
            if (listo) return;
            if (m?.tipo === 'codigo') {
                listo = true;
                clearTimeout(espera);
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
        proc.on('exit', () => fallar('El subbot se cerró antes de generar el código'));
    });
};
