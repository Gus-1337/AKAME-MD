import { Buffer } from 'node:buffer';
import config from '#config';

const API_BASE = ((global as any).APIs?.delirius?.url || 'https://api.delirius.online').replace(/\/+$/, '');
const UA = 'Mozilla/5.0 (Linux; Android 15; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';

/** Endpoints disponibles en la categoría NSFW de Delirius (todos sin parámetros). */
export const NSFW_ENDPOINTS = ['tiktok', 'girls', 'boobs', 'corean'] as const;
export type NsfwEndpoint = (typeof NSFW_ENDPOINTS)[number];

/**
 * Reactions de Delirius (`/reactions/<nombre>`).
 *
 * Ojo: esta familia NO funciona como `/nsfw/*`. Responde **JSON** con el enlace
 * (`{ status, data: { name, url } }`) y el archivo vive en otro dominio
 * (`cdn.delirius.online`), así que hay que hacer una segunda descarga.
 *
 * Además la URL viene en **http://** y el CDN responde `301` para eso, por lo que
 * se reescribe a `https://` antes de descargar.
 *
 * El contenido de cada reaction es lo que dice la ruta del enlace:
 * `.../reaction/sfw/...` es apto para todo público y `.../reaction/nsfw/...` es 18+.
 */
export const REACTION_ENDPOINTS = [
    'poke', 'hug', 'pat', 'kiss', 'cuddle', 'tickle', 'handhold', 'highfive', 'slap',
    'bite', 'bully', 'kick', 'kill', 'bonk', 'glomp', 'nom', 'lick', 'pout', 'blush',
    'smile', 'happy', 'cry', 'angry', 'dance', 'confy', 'cringe', 'smug', 'fluff', 'lay', 'tail'
] as const;
export type ReactionEndpoint = (typeof REACTION_ENDPOINTS)[number];

/** Límite de subida de WhatsApp (16 MB). Por encima de eso el envío falla. */
export const MAX_MEDIA_BYTES = 15 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
};

/**
 * La API de Delirius no siempre manda el content-type correcto
 * (p.ej. /nsfw/boobs y /nsfw/corean responden image/png con datos JPEG),
 * así que el tipo real se decide por la firma del archivo y el header es solo respaldo.
 */
const detectFromMagic = (buf: Buffer): { kind: 'video' | 'image'; ext: string; mime: string } | null => {
    if (buf.length >= 8) {
        if (buf.readUInt32BE(0) === 0x89504e47) return { kind: 'image', ext: 'png', mime: 'image/png' };
        if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: 'image', ext: 'jpg', mime: 'image/jpeg' };
        if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return { kind: 'image', ext: 'webp', mime: 'image/webp' };
        if (buf.toString('latin1', 0, 3) === 'GIF') return { kind: 'image', ext: 'gif', mime: 'image/gif' };
    }
    const probe = buf.subarray(0, Math.min(64, buf.length)).toString('latin1');
    const ftyp = probe.indexOf('ftyp');
    if (ftyp >= 4) {
        const brand = probe.slice(ftyp + 4, ftyp + 8);
        return { kind: 'video', ext: 'mp4', mime: brand === 'qt  ' ? 'video/quicktime' : 'video/mp4' };
    }
    if (buf.length >= 4 && buf.readUInt32BE(0) === 0x1a45dfa3) return { kind: 'video', ext: 'webm', mime: 'video/webm' };
    return null;
};

export interface NsfwMedia {
    endpoint: NsfwEndpoint | ReactionEndpoint;
    kind: 'video' | 'image';
    ext: string;
    mime: string;
    filename: string;
    buffer: Buffer;
    bytes: number;
    attempts: number;
    /** Enlace real del archivo. En `/nsfw/*` no existe (viene el binario directo). */
    url?: string;
    /** `sfw` o `nsfw` según la ruta del enlace. Solo lo saben las reactions. */
    rating?: 'sfw' | 'nsfw';
}

/** Decide tipo/extensión/mime a partir del binario (el content-type de la API no es de fiar). */
const classifyBuffer = (
    buffer: Buffer,
    headerMime: string,
    contentType: string
): { kind: 'video' | 'image'; ext: string; mime: string } => {
    const detected = detectFromMagic(buffer);
    const mime = detected?.mime || headerMime || 'application/octet-stream';
    const kind: 'video' | 'image' = detected?.kind || (mime.startsWith('video/') ? 'video' : 'image');
    const ext = detected?.ext || resolveExt(headerMime, contentType);
    return { kind, ext, mime };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const resolveExt = (mime: string, contentType: string): string => {
    if (EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
    const sub = contentType.split(';')[0].split('/')[1];
    return sub && sub.length <= 5 ? sub.replace(/[^\w]/g, '') : 'bin';
};

/**
 * Descarga el binario de un endpoint NSFW de Delirius.
 * La API entrega el archivo directo (no un JSON con la URL), por eso se lee el
 * content-type de la respuesta para saber si es imagen o video.
 * Reintenta varias veces porque el endpoint puede responder 5xx de forma intermitente.
 */
export const fetchNsfwMedia = async (endpoint: NsfwEndpoint, retries = 3): Promise<NsfwMedia> => {
    const url = `${API_BASE}/nsfw/${endpoint}`;
    let lastError: any = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 45000);
            const res = await fetch(url, {
                headers: { 'User-Agent': UA, Accept: '*/*' },
                signal: controller.signal
            });
            clearTimeout(timer);

            if (!res.ok) throw new Error(`La API respondió ${res.status}`);

            const contentType = (res.headers.get('content-type') || '').toLowerCase();
            const raw = await res.arrayBuffer();
            const buffer = Buffer.from(raw);
            if (buffer.length < 2048) throw new Error('La API devolvió un archivo vacío');

            const headerMime = contentType.split(';')[0].trim();
            const { kind, ext, mime } = classifyBuffer(buffer, headerMime, contentType);

            return {
                endpoint,
                kind,
                ext,
                mime,
                filename: `akame-nsfw-${endpoint}-${Date.now()}.${ext}`,
                buffer,
                bytes: buffer.length,
                attempts: attempt
            };
        } catch (e: any) {
            lastError = e;
            if (attempt < retries) await sleep(700 * attempt);
        }
    }

    throw new Error(lastError?.message || 'No se pudo obtener el contenido');
};

/** Endpoint al azar de la categoría NSFW. */
export const randomNsfwEndpoint = (): NsfwEndpoint =>
    NSFW_ENDPOINTS[Math.floor(Math.random() * NSFW_ENDPOINTS.length)];

/** Reaction al azar del catálogo de reactions. */
export const randomReactionEndpoint = (): ReactionEndpoint =>
    REACTION_ENDPOINTS[Math.floor(Math.random() * REACTION_ENDPOINTS.length)];

/**
 * Descarga una reaction de Delirius.
 *
 * Son dos pasos, no uno: primero el JSON con el enlace y después el archivo del CDN.
 * Los reintentos cubren ambos pasos, porque el CDN también puede fallar solo.
 */
export const fetchReactionMedia = async (reaction: ReactionEndpoint, retries = 3): Promise<NsfwMedia> => {
    let lastError: any = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 45000);
            const res = await fetch(`${API_BASE}/reactions/${reaction}`, {
                headers: { 'User-Agent': UA, Accept: 'application/json, */*' },
                signal: controller.signal
            });
            clearTimeout(timer);

            if (!res.ok) throw new Error(`La API respondió ${res.status}`);

            let json: any = null;
            try {
                json = await res.json();
            } catch {
                throw new Error('La API no devolvió un JSON válido');
            }
            if (json?.status === false) throw new Error('La API reportó un fallo');

            let url = String(json?.data?.url || '');
            if (!/^https?:\/\//i.test(url)) throw new Error('La respuesta venía sin enlace');

            // El CDN responde 301 (y una página HTML) si se le pide por http.
            url = url.replace(/^http:\/\//i, 'https://');

            const mediaController = new AbortController();
            const mediaTimer = setTimeout(() => mediaController.abort(), 45000);
            const mediaRes = await fetch(url, {
                headers: { 'User-Agent': UA, Accept: '*/*' },
                signal: mediaController.signal
            });
            clearTimeout(mediaTimer);

            if (!mediaRes.ok) throw new Error(`El CDN respondió ${mediaRes.status}`);

            const contentType = (mediaRes.headers.get('content-type') || '').toLowerCase();
            const buffer = Buffer.from(await mediaRes.arrayBuffer());
            if (buffer.length < 2048) throw new Error('El CDN devolvió un archivo vacío');

            const headerMime = contentType.split(';')[0].trim();
            const { kind, ext, mime } = classifyBuffer(buffer, headerMime, contentType);

            return {
                endpoint: reaction,
                kind,
                ext,
                mime,
                filename: `akame-reaction-${reaction}-${Date.now()}.${ext}`,
                buffer,
                bytes: buffer.length,
                attempts: attempt,
                url,
                rating: url.includes('/nsfw/') ? 'nsfw' : 'sfw'
            };
        } catch (e: any) {
            lastError = e;
            if (attempt < retries) await sleep(700 * attempt);
        }
    }

    throw new Error(lastError?.message || 'No se pudo obtener la reacción');
};

const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
};

/**
 * Descarga y envía el contenido NSFW al chat.
 * Devuelve true si se envió, false si falló (ya se avisó al chat en ese caso).
 */
export const sendNsfwMedia = async (ctx: any, endpoint: NsfwEndpoint, label?: string): Promise<boolean> => {
    const { sock, chat, m, usedPrefix, prefix } = ctx;
    const p = usedPrefix || prefix || (config as any).prefix || '.';
    const reply = (txt: string) =>
        typeof m?.reply === 'function' ? m.reply(txt) : sock.sendMessage(chat, { text: txt }, { quoted: m });

    try {
        await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => null);

        const media = await fetchNsfwMedia(endpoint);

        if (media.bytes > MAX_MEDIA_BYTES) {
            await sock.sendMessage(chat, { react: { text: '⚠️', key: m.key } }).catch(() => null);
            await reply(`✿ El ${media.kind === 'video' ? 'video' : 'archivo'} pesa ${formatBytes(media.bytes)} y supera el límite de WhatsApp. Prueba otra vez.`);
            return false;
        }

        const caption =
            `♡ AKAME-MD - NSFW ♡\n\n` +
            `✿ *Categoría:* ${label || endpoint}\n` +
            `✿ *Peso:* ${formatBytes(media.bytes)}\n\n` +
            `✿ Pedir otro » *${p}${endpoint === 'tiktok' ? 'nsfwtiktok' : endpoint}* o *${p}nsfwrandom* al azar\n` +
            `✿ Made by *${(config as any).devName || 'AKAME-MD'}* ♡`;

        const payload: any = media.kind === 'video'
            ? { video: media.buffer, caption, gifPlayback: false, mimetype: media.mime }
            : { image: media.buffer, caption, mimetype: media.mime };

        await sock.sendMessage(chat, payload, { quoted: m });
        await sock.sendMessage(chat, { react: { text: '💋', key: m.key } }).catch(() => null);
        return true;
    } catch (e: any) {
        console.error(`[NSFW:${endpoint}]`, e?.message || e);
        await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
        await reply(`✿ No pude traer el contenido bb, reintenta en un momento\n> ${e?.message || 'Error desconocido'}`);
        return false;
    }
};

/**
 * Descarga y envía una reaction al chat.
 * Devuelve true si se envió, false si falló (ya se avisó al chat en ese caso).
 */
export const sendReactionMedia = async (
    ctx: any,
    reaction: ReactionEndpoint,
    label?: string,
    extraCommand?: string
): Promise<boolean> => {
    const { sock, chat, m, usedPrefix, prefix } = ctx;
    const p = usedPrefix || prefix || (config as any).prefix || '.';
    const reply = (txt: string) =>
        typeof m?.reply === 'function' ? m.reply(txt) : sock.sendMessage(chat, { text: txt }, { quoted: m });

    try {
        await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => null);

        const media = await fetchReactionMedia(reaction);

        if (media.bytes > MAX_MEDIA_BYTES) {
            await sock.sendMessage(chat, { react: { text: '⚠️', key: m.key } }).catch(() => null);
            await reply(`✿ El ${media.kind === 'video' ? 'video' : 'archivo'} pesa ${formatBytes(media.bytes)} y supera el límite de WhatsApp. Prueba otra vez.`);
            return false;
        }

        const caption =
            `♡ AKAME-MD - NSFW ♡\n\n` +
            `✿ *Categoría:* ${label || reaction}\n` +
            `✿ *Peso:* ${formatBytes(media.bytes)}\n\n` +
            `✿ Pedir otro » *${p}${extraCommand || reaction}*` +
            (extraCommand && extraCommand !== reaction ? ` o *${p}${reaction}*` : '') +
            `\n✿ Made by *${(config as any).devName || 'AKAME-MD'}* ♡`;

        const payload: any = media.kind === 'video'
            ? { video: media.buffer, caption, gifPlayback: false, mimetype: media.mime }
            : { image: media.buffer, caption, mimetype: media.mime };

        await sock.sendMessage(chat, payload, { quoted: m });
        await sock.sendMessage(chat, { react: { text: '👉', key: m.key } }).catch(() => null);
        return true;
    } catch (e: any) {
        console.error(`[REACTION:${reaction}]`, e?.message || e);
        await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
        await reply(`✿ No pude traer la reacción bb, reintenta en un momento\n> ${e?.message || 'Error desconocido'}`);
        return false;
    }
};
