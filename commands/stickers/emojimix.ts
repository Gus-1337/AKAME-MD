// Combina dos emojis con Google Emoji Kitchen (sin clave) y responde como sticker.
import fs from 'fs';
import { writeExif } from '#sticker';

const FECHAS = [
    '20201001', '20210218', '20210521', '20210831', '20211115', '20220110', '20220203', '20220406',
    '20220506', '20220815', '20220823', '20221101', '20221107', '20230118', '20230126', '20230127',
    '20230216', '20230221', '20230301', '20230405', '20230418', '20230421', '20230426', '20230803',
    '20230818', '20230821', '20231113', '20231128', '20240206', '20240214', '20240530', '20240610',
    '20240715', '20241021', '20241023', '20250130', '20250204', '20250430', '20250501', '20250519',
    '20250731', '20251029', '20260128', '20260202', '20260429'
];

const BASE = 'https://www.gstatic.com/android/keyboard/emojikitchen';

const codigoEmoji = (emoji: string): string | null => {
    const cps = [...emoji.replace(/\uFE0F/g, '')];
    if (cps.length !== 1) return null;
    return cps[0].codePointAt(0)!.toString(16);
};

const emojisDe = (texto: string): string[] => {
    const seg = new Intl.Segmenter('es', { granularity: 'grapheme' });
    return [...seg.segment(texto)].map((s) => s.segment).filter((g) => /\p{Extended_Pictographic}/u.test(g));
};

const descargar = async (url: string): Promise<Buffer> => {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('no existe');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) throw new Error('vacío');
    return buf;
};

const mezclar = async (a: string, b: string): Promise<Buffer | null> => {
    const ca = codigoEmoji(a), cb = codigoEmoji(b);
    if (!ca || !cb) return null;
    const urls = FECHAS.flatMap((f) => [
        `${BASE}/${f}/u${ca}/u${ca}_u${cb}.png`,
        `${BASE}/${f}/u${cb}/u${cb}_u${ca}.png`
    ]);
    try {
        return await Promise.any(urls.map(descargar));
    } catch {
        return null;
    }
};

export default {
    command: ['emojimix', 'mezclaemoji'],
    description: 'Combina dos emojis. Uso: .emojimix 😂🔥',
    category: 'stickers',
    run: async ({ chat, m, sock, args, text }: any) => {
        const entrada = (args?.join(' ') || text || '').trim();
        const emojis = emojisDe(entrada);
        if (emojis.length !== 2) {
            return sock.sendMessage(chat, {
                text: '   ׄ  ✿  Escribe dos emojis.\n> Ej: *.emojimix 😂🔥*'
            }, { quoted: m });
        }
        const [a, b] = emojis;
        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => {});
            const png = await mezclar(a, b);
            if (!png) {
                await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => {});
                return sock.sendMessage(chat, {
                    text: `✿ No existe una mezcla de ${a} + ${b}. Prueba con otros emojis.`
                }, { quoted: m });
            }
            const ruta = await writeExif({ data: png, mimetype: 'image/png' }, {
                packname: 'EMOJIMIX',
                author: 'AKAME-MD',
                categories: [a, b]
            });
            const sticker = fs.readFileSync(ruta);
            fs.unlink(ruta, () => {});
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return sock.sendMessage(chat, { sticker }, { quoted: m });
        } catch (e: any) {
            return sock.sendMessage(chat, { text: `✿ No pude mezclar esos emojis.\n> ${e.message}` }, { quoted: m });
        }
    }
};
