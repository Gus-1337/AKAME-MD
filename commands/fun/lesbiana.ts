import { LESBICA, PALETAS_LESBICA, crearPortadaMedidor, fotoDePerfil } from '../../lib/medidor.ts';

// Niveles y frases del medidor lésbico (mismos textos de siempre)
const NIVELES: Array<{ hasta: number; nivel: string; frase: string }> = [
    { hasta: 20, nivel: 'Baja, hetero curiosa.', frase: 'Na bro, esa no es tortillera, tranquila.' },
    { hasta: 40, nivel: 'Algo se le nota.', frase: 'Ya le gustan las amigas un poquito, acéptalo sis.' },
    { hasta: 60, nivel: 'Bi-curious.', frase: 'Mitad y mitad, le gustan ambos bandos.' },
    { hasta: 80, nivel: 'Tortillera de closet.', frase: 'Ya no lo niegues mami, acéptalo.' },
    { hasta: 101, nivel: '100% Lesbiana.', frase: 'Confirmadísima, solo le gustan las bichotas.' }
];

export default {
    command: ['lesbiana'],
    description: 'Medidor lésbico con portada circular',
    category: 'fun',
    run: async ({ chat, m, sock }: any) => {
        const msgId = m?.id || m?.key?.id;
        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: 'lesbiana' });

            const who: string = m.mentionedJid?.[0] || m.quoted?.sender || m.sender;
            const numero = who.split('@')[0];

            const porcentaje = Math.floor(Math.random() * 101);
            const { nivel, frase } = NIVELES.find((n) => porcentaje <= n.hasta) || NIVELES[NIVELES.length - 1];

            const foto = await fotoDePerfil(sock, who);
            const texto = [
                '╭─────────────────╮',
                '  🌈 *EL MEDIDOR LESBIANA* 🌈',
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
                    titulo: 'MEDIDOR LESBIANA',
                    borde: LESBICA,
                    paletas: PALETAS_LESBICA
                });
            } catch (e: any) {
                console.error('[LESBIANA PORTADA]', e?.message);
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
