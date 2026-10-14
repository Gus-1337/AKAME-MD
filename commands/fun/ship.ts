import { crearCollage, descargarFoto } from '../../lib/ship-collage.ts';

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

const barra = (p: number) => {
    const llenos = Math.round(p / 10);
    return '█'.repeat(llenos) + '░'.repeat(10 - llenos);
};

// Quién es cada uno: los @ del mensaje, o quien escribe + otra persona al azar del grupo
const elegirPareja = async (ctx: any): Promise<[string, string]> => {
    const { chat, m, sock } = ctx;
    const jids = new Set<string>();

    const ctxInfo = m.message?.extendedTextMessage?.contextInfo || m.message?.imageMessage?.contextInfo;
    for (const j of ctxInfo?.mentionedJid || []) jids.add(j);
    for (const j of m.mentionedJid || []) jids.add(j);
    const texto = m.text || m.body || '';
    for (const match of texto.matchAll(/@(\d+)/g)) jids.add(match[1] + '@s.whatsapp.net');

    const lista = [...jids];
    if (lista.length >= 2) return [lista[0], lista[1]];
    if (lista.length === 1) return [m.sender, lista[0]];

    const respondido = (m as any).quoted?.sender;
    if (respondido) return [m.sender, respondido];

    try {
        const meta = await sock.groupMetadata(chat);
        const otros = meta.participants.map((p: any) => p.id).filter((id: string) => id !== m.sender);
        if (otros.length) return [m.sender, otros[Math.floor(Math.random() * otros.length)]];
    } catch {}
    return [m.sender, m.sender];
};

const nivelDe = (p: number) => {
    if (p <= 20) return { nivel: 'Nada que ver', frase: 'Ni con brujería pegan esos dos.', emoji: '💀' };
    if (p <= 40) return { nivel: 'Poquita química', frase: 'Uno está más ilusionado que el otro.', emoji: '🤏' };
    if (p <= 60) return { nivel: 'Buena pareja', frase: 'Se ven bien juntos, dense un beso ya.', emoji: '💕' };
    if (p <= 80) return { nivel: 'Pareja perfecta', frase: 'Ya son novios y no lo aceptan.', emoji: '🥰' };
    return { nivel: 'Almas gemelas', frase: 'Ya cásense, están hechos el uno para el otro.', emoji: '❤️‍🔥' };
};

const FUTUROS = [
    'Se casan en 3 meses 💍',
    'Van a terminar mal 💔',
    'Toca boda privada',
    'Van a tener 2 hijos 👶',
    'Puro cacho nomás 🤡',
    'Amor eterno 🔥'
];

export default {
    command: ['ship', 'shippear', 'pareja'],
    description: 'Mide la compatibilidad de dos personas con collage de sus fotos',
    category: 'fun',
    run: async (ctx: any) => {
        const { chat, m, sock } = ctx;

        const [u1, u2] = await elegirPareja(ctx);
        if (u1 === u2) {
            return sock.sendMessage(chat, {
                text: caja('SHIP', ['✧ Menciona a dos personas.', '✦ Ej: .ship @persona1 @persona2'])
            }, { quoted: m });
        }

        const porcentaje = Math.floor(Math.random() * 101);
        const besos = Math.floor(Math.random() * 101);
        const peleas = Math.floor(Math.random() * 101);
        const fidelidad = Math.floor(Math.random() * 101);
        const futuro = FUTUROS[Math.floor(Math.random() * FUTUROS.length)];
        const { nivel, frase, emoji } = nivelDe(porcentaje);

        // Fotos de perfil reales; si alguien no tiene, sale su color de respaldo
        const fotoUrl = async (jid: string) => {
            try { return await sock.profilePictureUrl(jid, 'image'); } catch { return null; }
        };
        const [url1, url2] = await Promise.all([fotoUrl(u1), fotoUrl(u2)]);
        const [foto1, foto2] = await Promise.all([
            url1 ? descargarFoto(url1) : Promise.resolve(null),
            url2 ? descargarFoto(url2) : Promise.resolve(null)
        ]);

        const collage = await crearCollage(foto1, foto2, u1.split('@')[0], u2.split('@')[0], porcentaje);

        const texto = [
            `˚₊· ͟͟͞͞➳❥ *S H I P* ${emoji}`,
            '───────────────',
            `💘 @${u1.split('@')[0]}  +  @${u2.split('@')[0]}`,
            '',
            `❤️ Amor » *${porcentaje}%*  ${barra(porcentaje)}`,
            `💋 Besos » *${besos}%*`,
            `😡 Peleas » *${peleas}%*`,
            `💍 Fidelidad » *${fidelidad}%*`,
            '',
            `🔮 Futuro » ${futuro}`,
            `💬 Estado » *${nivel}*`,
            '───────────────',
            `> ${frase}`
        ].join('\n');

        return sock.sendMessage(chat, {
            image: collage,
            caption: texto,
            mentions: [u1, u2]
        }, { quoted: m });
    }
};
