// Bot primario por grupo. Lo comparten el bot principal y todos los subbots (cada proceso lee el mismo archivo),
// por eso se guarda en database/ y no en la base de datos de cada bot.
import fs from 'fs';
import path from 'path';

const ARCHIVO = path.join(process.cwd(), 'database', 'primarios.json');

type Mapa = Record<string, string>; // chat (grupo) -> número del bot primario (solo dígitos)

const leer = (): Mapa => {
    try {
        return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')) || {};
    } catch {
        return {};
    }
};

// Escritura atómica: primero a un archivo temporal y luego se cambia el nombre, para no dejar el JSON a medias
const escribir = (mapa: Mapa) => {
    fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
    const tmp = `${ARCHIVO}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(mapa, null, 2));
    fs.renameSync(tmp, ARCHIVO);
};

/** Número del bot primario del grupo, o null si no hay ninguno asignado. */
export const obtenerPrimario = (grupo: string): string | null => leer()[grupo] || null;

/** Asigna el bot primario del grupo. */
export const asignarPrimario = (grupo: string, numero: string) => {
    const mapa = leer();
    mapa[grupo] = numero.replace(/\D/g, '');
    escribir(mapa);
};

/** Quita el bot primario: el grupo vuelve a responder todos los bots. */
export const quitarPrimario = (grupo: string) => {
    const mapa = leer();
    delete mapa[grupo];
    escribir(mapa);
};
