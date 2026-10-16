import { Jimp, loadFont, measureText } from 'jimp';
import { SANS_32_WHITE, SANS_64_WHITE } from 'jimp/fonts';
import { avatarRespaldo, descargarFoto } from '../../lib/ship-collage.ts';

// Portada circular: la foto de perfil con borde arcoíris, fondo oscuro y el porcentaje.
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

/** Dibuja la portada: foto circular con borde arcoíris degradado, fondo oscuro y textos abajo. */
async function crearPortada(foto: any, porcentaje: number, nombre: string): Promise<Buffer> {
    const N = LADO;
    const CX = N / 2;
    const CY = 330;                 // centro del círculo
    const R = 230;                  // radio de la foto
    const GROSOR = 22;              // grosor del borde arcoíris

    const lienzo = new Jimp({ width: N, height: N, color: 0xffffffff });
    const d = lienzo.bitmap.data;

    // Fondo: degradado vertical de morado oscuro
    for (let y = 0; y < N; y++) {
        const t = y / N;
        for (let x = 0; x < N; x++) {
            const i = (y * N + x) * 4;
            d[i] = 22 + (60 - 22) * t;
            d[i + 1] = 16 + (18 - 16) * t;
            d[i + 2] = 40 + (78 - 40) * t;
            d[i + 3] = 255;
        }
    }

    // Foto recortada en el centro del círculo
    const dim = R * 2;
    const f = foto.clone().cover({ w: dim, h: dim });
    const fd = f.bitmap.data;

    for (let y = CY - R - GROSOR; y <= CY + R + GROSOR; y++) {
        for (let x = CX - R - GROSOR; x <= CX + R + GROSOR; x++) {
            if (x < 0 || y < 0 || x >= N || y >= N) continue;
            const dx = x + 0.5 - CX;
            const dy = y + 0.5 - CY;
            const dist = Math.hypot(dx, dy);
            const i = (y * N + x) * 4;

            if (dist <= R) {
                // Dentro del círculo: la foto
                const fx = Math.min(dim - 1, Math.max(0, Math.floor(x - (CX - R))));
                const fy = Math.min(dim - 1, Math.max(0, Math.floor(y - (CY - R))));
                const j = (fy * dim + fx) * 4;
                d[i] = fd[j];
                d[i + 1] = fd[j + 1];
                d[i + 2] = fd[j + 2];
            } else if (dist <= R + GROSOR) {
                // Borde: arcoíris que gira alrededor del círculo
                const ang = (Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI); // 0..1
                const pos = ang * ARCOIRIS.length;
                const a = Math.floor(pos) % ARCOIRIS.length;
                const b = (a + 1) % ARCOIRIS.length;
                const k = pos - Math.floor(pos);
                const c1 = ARCOIRIS[a];
                const c2 = ARCOIRIS[b];
                d[i] = c1[0] + (c2[0] - c1[0]) * k;
                d[i + 1] = c1[1] + (c2[1] - c1[1]) * k;
                d[i + 2] = c1[2] + (c2[2] - c1[2]) * k;
            }
        }
    }

    const fuenteGrande = await loadFont(SANS_64_WHITE);
    const fuenteChica = await loadFont(SANS_32_WHITE);

    const titulo = 'MEDIDOR GAY';
    const tw = measureText(fuenteChica, titulo);
    lienzo.print({ font: fuenteChica, x: Math.round((N - tw) / 2), y: CY + R + GROSOR + 26, text: titulo });

    const pct = `${porcentaje}%`;
    const pw = measureText(fuenteGrande, pct);
    lienzo.print({ font: fuenteGrande, x: Math.round((N - pw) / 2), y: CY + R + GROSOR + 62, text: pct });

    const nombreCorto = nombre.length > 28 ? nombre.slice(0, 27) + '…' : nombre;
    const nw = measureText(fuenteChica, nombreCorto);
    lienzo.print({ font: fuenteChica, x: Math.round((N - nw) / 2), y: N - 52, text: nombreCorto });

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
