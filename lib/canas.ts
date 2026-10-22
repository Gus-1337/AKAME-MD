import fs from 'fs';
import path from 'path';

/**
 * Cañas de pescar. Cada tirada de peso se hace `muestras` veces y se queda la más grande:
 * con una caña mejor salen más peses grandes. La caña básica es la que todos tienen.
 */
export interface Cana {
    id: string;
    nombre: string;
    emoji: string;
    precio: number;   // 0 = la trae todo el mundo
    muestras: number;
    descripcion: string;
    imagen: string | null; // archivo en img/canas/
}

export const CANAS: Cana[] = [
    { id: 'basica', nombre: 'Caña básica', emoji: '🎣', precio: 0, muestras: 1,
      descripcion: 'La de siempre. Peces chicos y medianos.', imagen: null },
    { id: 'bambu', nombre: 'Caña de bambú', emoji: '🎋', precio: 2500, muestras: 2,
      descripcion: 'Más firme. Algo más de chance de peces grandes.', imagen: 'bambu.jpg' },
    { id: 'fibra', nombre: 'Caña de fibra', emoji: '💠', precio: 8000, muestras: 3,
      descripcion: 'Ligera y resistente. Buena para peces grandes.', imagen: 'fibra.jpg' },
    { id: 'oro', nombre: 'Caña de oro', emoji: '🥇', precio: 25000, muestras: 4,
      descripcion: 'Carrete de oro. Peces grandes casi siempre.', imagen: 'oro.jpg' },
    { id: 'legendaria', nombre: 'Caña legendaria', emoji: '🌌', precio: 75000, muestras: 6,
      descripcion: 'Forjada con luz de estrellas. Lo más grande del mar.', imagen: 'legendaria.jpg' }
];

export const CANA_POR_ID: Record<string, Cana> = Object.fromEntries(CANAS.map((c) => [c.id, c]));

/** Caña equipada del usuario (la básica si nunca compró). */
export const canaDe = (user: any): Cana => CANA_POR_ID[user?.cana] || CANA_POR_ID.basica;

/** ¿El usuario ya tiene esa caña? (la básica siempre) */
export const tieneCana = (user: any, id: string): boolean =>
    id === 'basica' || (Array.isArray(user?.canas) && user.canas.includes(id));

/** Tira el peso de un pez con la caña: se queda con el mejor de varias tiradas. */
export const tirarRatio = (cana: Cana): number => {
    let mejor = 0;
    for (let i = 0; i < cana.muestras; i++) mejor = Math.max(mejor, Math.random());
    return mejor;
};

const RUTA_IMG = path.join(process.cwd(), 'img', 'canas');
const cache: Record<string, Buffer | null> = {};

/** Imagen de la caña (o null si no tiene o no existe el archivo). */
export const imagenDeCana = (cana: Cana): Buffer | null => {
    if (!cana.imagen) return null;
    if (!(cana.imagen in cache)) {
        const ruta = path.join(RUTA_IMG, cana.imagen);
        cache[cana.imagen] = fs.existsSync(ruta) ? fs.readFileSync(ruta) : null;
    }
    return cache[cana.imagen];
};
