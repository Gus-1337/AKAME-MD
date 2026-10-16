import { ARCOIRIS, PALETAS_ROSA, crearPortadaMedidor, fotoDePerfil } from '../../lib/medidor.ts';

const frasesBajo = [
    'Na, es poquito, casi ni se nota. Por ahora estás safe 😅',
    'Tranquilo bro, ese % no es nada, aún eres hetero',
    'Uy con eso no hay nada que aceptar, estás limpio'
];
const frasesMedioBajo = [
    'Algo hay ahí bro, acéptalo poco a poco 😏',
    'Ya se te está notando bro, ve aceptándolo',
    'Ese % ya preocupa, toca aceptarlo'
];
const frasesMedio = [
    'Mitad y mitad bro, ya no puedes negarlo. Acéptalo 👹',
    'Con ese % ya es hora de que lo aceptes, no lo niegues',
    'Bi confirmado, toca aceptar tu destino 🌈'
];
const frasesAlto = [
    'Bro con ese % ya acéptalo, no hay vuelta atrás 💀',
    'Ya no lo escondas bro, el medidor te delató. Acéptalo',
    'Gay de closet detectado, deja de negarlo y acéptalo'
];
const frasesMax = [
    'Bro acéptalo de una vez, eres 100% gay y punto 🌈👠',
    'Ya no hay nada que hacer, acéptalo que te gustan los bros',
    'Con ese % ya pide tu membresía premium, acéptalo bro 👹'
];

const elegir = (lista: string[]) => lista[Math.floor(Math.random() * lista.length)];

/** Nivel y frase según el porcentaje. */
function nivelDe(p: number): { nivel: string; frase: string } {
    if (p <= 20) return { nivel: 'Bajo, casi hetero.', frase: elegir(frasesBajo) };
    if (p <= 40) return { nivel: 'Altamente detectado.', frase: elegir(frasesMedioBajo) };
    if (p <= 60) return { nivel: 'Mitad y mitad, bi sospechoso.', frase: elegir(frasesMedio) };
    if (p <= 80) return { nivel: 'Gay de closet detectado.', frase: elegir(frasesAlto) };
    return { nivel: '100% gay, ya sal del closet.', frase: elegir(frasesMax) };
}

export default {
    command: ['gay', 'medidor', 'gaymeter'],
    description: 'Medidor gay con portada circular',
    category: 'fun',
    run: async ({ chat, m, sock }: any) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'gay' });

            // A quién se mide: mención, mensaje citado o quien escribe
            const who: string = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
            const numero = who.split('@')[0];

            const porcentaje = Math.floor(Math.random() * 101);
            const { nivel, frase } = nivelDe(porcentaje);

            const foto = await fotoDePerfil(sock, who);
            const texto = [
                '╭─────────────────╮',
                '  🌈 *EL MEDIDOR INVISIBLE* 🌈',
                '╰─────────────────╯',
                '',
                `✧ *Escaneado:* @${numero}`,
                `✦ *Resultado:* ${porcentaje}%`,
                `✦ *Nivel:* ${nivel}`,
                '',
                `_${frase}_`,
                '',
                '> AKAME-MD 🌸'
            ].join('\n');

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });

            let imagen: Buffer | null = null;
            try {
                imagen = await crearPortadaMedidor(foto, porcentaje, `@${numero}`, {
                    titulo: 'MEDIDOR GAY',
                    borde: ARCOIRIS,
                    paletas: PALETAS_ROSA
                });
            } catch (e: any) {
                console.error('[GAY PORTADA]', e?.message);
            }

            const result = imagen
                ? await sock.sendMessage(chat, { image: imagen, caption: texto, mentions: [who] }, { quoted: m })
                : await sock.sendMessage(chat, { text: texto, mentions: [who] }, { quoted: m });

            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;
        } catch (e: any) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e?.message });
            return sock.sendMessage(chat, { text: '✿ No pude hacer el medidor ahora, prueba otra vez.' }, { quoted: m });
        }
    }
};
