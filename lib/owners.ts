import fs from 'node:fs';
import path from 'node:path';

/** Owners agregados con `.setowner` (además de los de config.ts). Se guardan en database/owners.json. */
const ARCHIVO = path.join(process.cwd(), 'database', 'owners.json');

const soloDigitos = (x: string) => String(x || '').split('@')[0].split(':')[0].replace(/[^\d]/g, '');

export const leerOwnersExtra = (): string[] => {
    try {
        const data = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
        return Array.isArray(data) ? data.map(String) : [];
    } catch {
        return [];
    }
};

export const esOwnerExtra = (numero: string): boolean => {
    const n = soloDigitos(numero);
    return !!n && leerOwnersExtra().includes(n);
};

/** Agrega un owner. Devuelve false si ya estaba. */
export const agregarOwnerExtra = (numero: string): boolean => {
    const n = soloDigitos(numero);
    if (!n) return false;
    const lista = leerOwnersExtra();
    if (lista.includes(n)) return false;
    lista.push(n);
    fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
    fs.writeFileSync(ARCHIVO, JSON.stringify(lista, null, 2));
    return true;
};

/** Quita un owner agregado con .setowner. Devuelve false si no estaba en la lista. */
export const quitarOwnerExtra = (numero: string): boolean => {
    const n = soloDigitos(numero);
    const lista = leerOwnersExtra();
    if (!n || !lista.includes(n)) return false;
    fs.writeFileSync(ARCHIVO, JSON.stringify(lista.filter((x) => x !== n), null, 2));
    return true;
};
