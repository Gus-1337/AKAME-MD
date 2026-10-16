import { TRANS, PALETAS_TRANS, correrMedidor } from '../../lib/medidor.ts';

export default {
    command: ['trans'],
    description: 'Medidor trans con portada circular',
    category: 'fun',
    run: async (ctx: any) => correrMedidor(ctx, {
        id: 'trans',
        titulo: 'MEDIDOR TRANS',
        encabezado: '⚧ *EL MEDIDOR TRANS* ⚧',
        borde: TRANS,
        paletas: PALETAS_TRANS,
        niveles: [
            { hasta: 20, nivel: 'Nada trans.', frases: ['Estás normal por ahora.'] },
            { hasta: 40, nivel: 'Curiosidad trans.', frases: ['Algo te llama la atención, acéptalo poco a poco.'] },
            { hasta: 60, nivel: 'En transición.', frases: ['Ya estás dudando bro, toca aceptarlo.'] },
            { hasta: 80, nivel: 'Trans de closet.', frases: ['Ya no lo escondas, acéptalo.'] },
            { hasta: 101, nivel: '100% Trans.', frases: ['Confirmado, ya saca tu peluca.'] }
        ]
    })
};
