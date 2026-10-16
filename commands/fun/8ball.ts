// Respuestas en español, agrupadas como la bola 8 clásica (con su tono)
const POSITIVAS = [
    'Sí, definitivamente.',
    'Sin duda.',
    'Puedes confiar en ello.',
    'Como yo lo veo, sí.',
    'Lo más probable.',
    'Todo apunta a que sí.',
    'Las señales dicen que sí.',
    'Sí, adelante.'
];
const NEUTRAS = [
    'Pregunta de nuevo más tarde.',
    'Mejor no te lo digo ahora.',
    'No puedo predecirlo ahora.',
    'Concéntrate y vuelve a preguntar.',
    'Todavía no está claro.'
];
const NEGATIVAS = [
    'No lo cuentes con ello.',
    'Mi respuesta es no.',
    'Mis fuentes dicen que no.',
    'Las perspectivas no son buenas.',
    'Lo dudo mucho.',
    'Definitivamente no.'
];

const elegir = <T,>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)];

/** Respuesta al azar, con un tono según el grupo (positiva, neutra o negativa). */
function respuesta(): { texto: string; animo: string } {
    const r = Math.random();
    if (r < 0.4) return { texto: elegir(POSITIVAS), animo: '🟢 Positiva' };
    if (r < 0.7) return { texto: elegir(NEUTRAS), animo: '🟡 Neutra' };
    return { texto: elegir(NEGATIVAS), animo: '🔴 Negativa' };
}

export default {
    command: ['8ball', 'bola8'],
    description: 'Hazle una pregunta a la bola mágica',
    category: 'fun',
    run: async ({ chat, m, sock, args, text }: any) => {
        const pregunta = (args?.join(' ') || text || '').trim();
        if (!pregunta) {
            return sock.sendMessage(chat, {
                text: [
                    '˚₊· ͟͟͞͞➳❥ *BOLA 8*',
                    '───────────────',
                    '✧ Escribe tu pregunta.',
                    '✦ Ejemplo: *.8ball ¿Me va a ir bien hoy?*',
                    '───────────────',
                    '> AKAME-MD 🌸'
                ].join('\n')
            }, { quoted: m });
        }

        const { texto, animo } = respuesta();
        return sock.sendMessage(chat, {
            text: [
                '˚₊· ͟͟͞͞➳❥ *BOLA 8*',
                '───────────────',
                `✧ *Pregunta:* ${pregunta}`,
                '',
                `🎱 *${texto}*`,
                '',
                `✦ Ánimo » ${animo}`,
                '───────────────',
                '> AKAME-MD 🌸'
            ].join('\n')
        }, { quoted: m });
    }
};
