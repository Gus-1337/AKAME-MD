import { HETERO, PALETAS_HETERO, correrMedidor } from '../../lib/medidor.ts';

export default {
    command: ['hetero'],
    description: 'Medidor hetero con portada circular',
    category: 'fun',
    run: async (ctx: any) => correrMedidor(ctx, {
        id: 'hetero',
        titulo: 'MEDIDOR HETERO',
        encabezado: '🧢 *EL MEDIDOR HETERO* 🧢',
        borde: HETERO,
        paletas: PALETAS_HETERO,
        niveles: [
            { hasta: 20, nivel: 'Nada hetero.', frases: ['Bro acéptalo, de hetero no tienes nada 💀'] },
            { hasta: 40, nivel: 'Casi nada hetero.', frases: ['Muy poco hetero, se te nota lo gay.'] },
            { hasta: 60, nivel: 'Mitad hetero.', frases: ['Un rato hetero un rato no, estás raro.'] },
            { hasta: 80, nivel: 'Bastante hetero.', frases: ['Por ahora estás safe bro, aún aguantas.'] },
            { hasta: 101, nivel: '100% Hetero macho alfa.', frases: ['Confirmado hetero, puro macho.'] }
        ]
    })
};
