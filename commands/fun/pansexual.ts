import { PANSEXUAL, PALETAS_PANSEXUAL, correrMedidor } from '../../lib/medidor.ts';

export default {
    command: ['pansexual'],
    description: 'Medidor pansexual con portada circular',
    category: 'fun',
    run: async (ctx: any) => correrMedidor(ctx, {
        id: 'pansexual',
        titulo: 'MEDIDOR PANSEXUAL',
        encabezado: '💖 *EL MEDIDOR PANSEXUAL* 💖',
        borde: PANSEXUAL,
        paletas: PALETAS_PANSEXUAL,
        niveles: [
            { hasta: 20, nivel: 'Bajo, muy selectivo.', frases: ['Na, tu solo miras uno, estás safe.'] },
            { hasta: 40, nivel: 'Curioso.', frases: ['Algo hay ahí, te gusta lo que sea con que respire.'] },
            { hasta: 60, nivel: 'Pan en proceso.', frases: ['Ya te da igual todo, acéptalo.'] },
            { hasta: 80, nivel: 'Pansexual detectado.', frases: ['Te gusta hasta el del frente, acéptalo bro.'] },
            { hasta: 101, nivel: '100% Pansexual.', frases: ['Te enamoras de todo lo que se mueva, confirmado.'] }
        ]
    })
};
