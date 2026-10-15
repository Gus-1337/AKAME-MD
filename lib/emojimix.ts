// Combina dos emojis con Google Emoji Kitchen (sin clave). Devuelve un PNG o null si no existe la combinación.
const FECHAS = [
    '20201001', '20210218', '20210521', '20210831', '20211115', '20220110', '20220203', '20220406',
    '20220506', '20220815', '20220823', '20221101', '20221107', '20230118', '20230126', '20230127',
    '20230216', '20230221', '20230301', '20230405', '20230418', '20230421', '20230426', '20230803',
    '20230818', '20230821', '20231113', '20231128', '20240206', '20240214', '20240530', '20240610',
    '20240715', '20241021', '20241023', '20250130', '20250204', '20250430', '20250501', '20250519',
    '20250731', '20251029', '20260128', '20260202', '20260429'
];

const BASE = 'https://www.gstatic.com/android/keyboard/emojikitchen';

/** Código hex de un emoji de un solo codepoint (sin selector FE0F). null si no sirve. */
export const codigoEmoji = (emoji: string): string | null => {
    const cps = [...emoji.replace(/\uFE0F/g, '')];
    if (cps.length !== 1) return null;
    return cps[0].codePointAt(0)!.toString(16);
};

/** Lista los emojis de un texto (cada uno como grafema). */
export const emojisDe = (texto: string): string[] => {
    const seg = new Intl.Segmenter('es', { granularity: 'grapheme' });
    return [...seg.segment(texto)].map((s) => s.segment).filter((g) => /\p{Extended_Pictographic}/u.test(g));
};

const existe = async (url: string): Promise<Buffer> => {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error('no existe');
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) throw new Error('vacío');
    return buf;
};

/** Busca la combinación a+b (y b+a) en todas las fechas a la vez. */
export const mezclarEmojis = async (a: string, b: string): Promise<Buffer | null> => {
    const ca = codigoEmoji(a), cb = codigoEmoji(b);
    if (!ca || !cb) return null;
    const urls = FECHAS.flatMap((f) => [
        `${BASE}/${f}/u${ca}/u${ca}_u${cb}.png`,
        `${BASE}/${f}/u${cb}/u${cb}_u${ca}.png`
    ]);
    try {
        return await Promise.any(urls.map(existe));
    } catch {
        return null;
    }
};
