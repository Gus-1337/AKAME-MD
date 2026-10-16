import { BI, PALETAS_BI, correrMedidor } from '../../lib/medidor.ts';

export default {
    command: ['bi', 'bisexual'],
    description: 'Medidor bi con portada circular',
    category: 'fun',
    run: async (ctx: any) => correrMedidor(ctx, {
        id: 'bi',
        titulo: 'MEDIDOR BI',
        encabezado: '💜 *EL MEDIDOR BI* 💜',
        borde: BI,
        paletas: PALETAS_BI,
        niveles: [
            { hasta: 20, nivel: 'Nada bi.', frases: ['Na bro, tu eres de un solo bando.'] },
            { hasta: 40, nivel: 'Un poquito bi.', frases: ['Ya le miras a ambos, acéptalo.'] },
            { hasta: 60, nivel: 'Bi confirmado a medias.', frases: ['Te gustan los dos, ya acéptalo.'] },
            { hasta: 80, nivel: 'Bi de closet.', frases: ['Deja de negarlo bro, eres bi.'] },
            { hasta: 101, nivel: '100% Bisexual.', frases: ['Confirmado, le das a todo.'] }
        ]
    })
};
