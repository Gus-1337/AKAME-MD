import fs from 'fs';
import path from 'path';

/** Archivo donde se guarda el prefijo del bot para que sobreviva a los reinicios. */
const ARCHIVO = path.join(process.cwd(), 'prefijo-guardado.json');

/** Devuelve el prefijo guardado (undefined si nunca se cambió). */
export const leerPrefijo = (): any => {
    try {
        if (!fs.existsSync(ARCHIVO)) return undefined;
        return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')).globalPrefix;
    } catch (e) {
        console.error('[prefijo] No se pudo leer el prefijo guardado:', e);
        return undefined;
    }
};

/** Guarda el prefijo actual: string, array de strings o 1 (sin prefijos). */
export const guardarPrefijo = (valor: any): void => {
    try {
        fs.writeFileSync(ARCHIVO, JSON.stringify({ globalPrefix: valor }));
    } catch (e) {
        console.error('[prefijo] No se pudo guardar el prefijo:', e);
    }
};
