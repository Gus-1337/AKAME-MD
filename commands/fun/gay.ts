import { Jimp, loadFont, measureText } from 'jimp';
import { SANS_32_WHITE, SANS_64_WHITE } from 'jimp/fonts';
import { avatarRespaldo, descargarFoto } from '../../lib/ship-collage.ts';

// Portada: la foto de perfil con filtro arcoíris, franja oscura abajo y el porcentaje.
const LADO = 800;
const FRANJA_Y = 620;
const ARCOIRIS = [
    [228, 3, 3], [255, 140, 0], [255, 237, 0], [0, 128, 38], [0, 77, 255], [117, 7, 135]
];

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

/** Nivel y frase según el porcentaje (mismos textos de siempre). */
function nivelDe(p: number): { nivel: string; frase: string } {
    if (p <= 20) return { nivel: 'Bajo, casi hetero.', frase: elegir(frasesBajo) };
    if (p <= 40) return { nivel: 'Altamente detectado.', frase: elegir(frasesMedioBajo) };
    if (p <= 60) return { nivel: 'Mitad y mitad, bi sospechoso.', frase: elegir(frasesMedio) };
    if (p <= 80) return { nivel: 'Gay de closet detectado.', frase: elegir(frasesAlto) };
    return { nivel: '100% gay, ya sal del closet.', frase: elegir(frasesMax) };
}

/** Dibuja la portada: foto con filtro arcoíris, franja oscura y el porcentaje. */
async function crearPortada(foto: any, porcentaje: number, nombre: string): Promise<Buffer> {
    const lienzo = foto.clone().cover({ w: LADO, h: LADO });
    const d = lienzo.bitmap.data;

    // Filtro arcoíris: franjas horizontales mezcladas con la foto (28%)
    const franja = LADO / ARCOIRIS.length;
    for (let y = 0; y < LADO; y++) {
        const [r, g, b] = ARCOIRIS[Math.min(ARCOIRIS.length - 1, Math.floor(y / franja))];
        for (let x = 0; x < LADO; x++) {
            const i = (y * LADO + x) * 4;
            d[i] = d[i] * 0.72 + r * 0.28;
            d[i + 1] = d[i + 1] * 0.72 + g * 0.28;
            d[i + 2] = d[i + 2] * 0.72 + b * 0.28;
        }
    }

    // Franja oscura abajo para que se lea el texto
    for (let y = FRANJA_Y; y < LADO; y++) {
        for (let x = 0; x < LADO; x++) {
            const i = (y * LADO + x) * 4;
            d[i] = d[i] * 0.3;
            d[i + 1] = d[i + 1] * 0.3;
            d[i + 2] = d[i + 2] * 0.3;
        }
    }

    const fuenteGrande = await loadFont(SANS_64_WHITE);
    const fuenteChica = await loadFont(SANS_32_WHITE);

    const titulo = 'MEDIDOR GAY';
    const tw = measureText(fuenteChica, titulo);
    lienzo.print({ font: fuenteChica, x: Math.round((LADO - tw) / 2), y: FRANJA_Y + 12, text: titulo });

    const pct = `${porcentaje}%`;
    const pw = measureText(fuenteGrande, pct);
    lienzo.print({ font: fuenteGrande, x: Math.round((LADO - pw) / 2), y: FRANJA_Y + 50, text: pct });

    const nombreCorto = nombre.length > 28 ? nombre.slice(0, 27) + '…' : nombre;
    const nw = measureText(fuenteChica, nombreCorto);
    lienzo.print({ font: fuenteChica, x: Math.round((LADO - nw) / 2), y: LADO - 48, text: nombreCorto });

    return await lienzo.getBuffer('image/png');
}

export default {
    command: ['gay', 'medidor', 'gaymeter'],
    description: 'Medidor gay con portada arcoíris',
    category: 'fun',
    run: async ({ chat, m, sock, args }: any) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'gay' });

            // A quién se mide: mención, mensaje citado o quien escribe
            const who: string = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
            const numero = who.split('@')[0];

            const porcentaje = Math.floor(Math.random() * 101);
            const { nivel, frase } = nivelDe(porcentaje);

            // Foto de perfil; si no tiene, avatar de respaldo
            let foto: any = null;
            try {
                const url = await sock.profilePictureUrl(who, 'image');
                if (url) foto = await descargarFoto(url);
            } catch { /* sin foto */ }
            if (!foto) foto = avatarRespaldo(numero);

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
                imagen = await crearPortada(foto, porcentaje, `@${numero}`);
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
