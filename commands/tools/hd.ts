import { downloadMediaMessage } from '@whiskeysockets/baileys';
import P from 'pino';
import { Jimp } from 'jimp';

// Clave de Stellar (API principal) y de NyxDLaPI (para subir la imagen y obtener un enlace público).
const STELLAR_KEY = process.env.STELLAR_KEY || 'proyectsV2';
const NYX_KEY = process.env.NYX_KEY || '';

// Tamaño máximo del lado más largo para el respaldo local
const LADO_MAX = 2048;
// Imágenes que ya son grandes se agrandan menos (respaldo local)
const LADO_OBJETIVO = 1600;

/** Sube la imagen a NyxDLaPI y devuelve un enlace público (las APIs necesitan una URL). */
async function subirTemporal(buf: Buffer, mime: string): Promise<string> {
    if (!NYX_KEY) throw new Error('Falta NYX_KEY');
    const form = new FormData();
    form.append('files', new Blob([new Uint8Array(buf)], { type: mime }), `imagen.${mime.split('/')[1] || 'jpg'}`);
    const res = await fetch('https://nyxdlapi.vercel.app/api/tools/tourl', {
        method: 'POST', body: form,
        headers: { 'X-API-Key': NYX_KEY, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(30000)
    });
    const data: any = await res.json().catch(() => null);
    const url: string | undefined = data?.result?.files?.[0]?.url;
    if (!res.ok || !url) throw new Error('No se pudo subir la imagen');
    return url;
}

/** Descarga la imagen mejorada. Devuelve null si la respuesta no es una imagen. */
async function descargarImagen(url: string): Promise<Buffer | null> {
    const res = await fetch(url, { signal: AbortSignal.timeout(60000) }).catch(() => null);
    if (!res || !res.ok) return null;
    if (!(res.headers.get('content-type') || '').startsWith('image/')) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 1000 ? buf : null;
}

/** Mejora con IA: Stellar primero, Deline de respaldo. */
async function mejorarConApi(buffer: Buffer, mime: string): Promise<Buffer | null> {
    let urlPublica: string;
    try {
        urlPublica = await subirTemporal(buffer, mime);
    } catch {
        return null;
    }

    const stellar = new URL('https://api.stellarwa.xyz/tools/upscale');
    stellar.searchParams.set('apikey', STELLAR_KEY);
    stellar.searchParams.set('method', 'url');
    stellar.searchParams.set('url', urlPublica);
    const deBien = await descargarImagen(stellar.toString());
    if (deBien) return deBien;

    const deline = new URL('https://api.deline.web.id/tools/hd');
    deline.searchParams.set('url', urlPublica);
    return await descargarImagen(deline.toString());
}

/** Agranda y afila la imagen sin IA (respaldo si las APIs fallan). */
async function mejorarLocal(buffer: Buffer): Promise<Buffer> {
    const img = await Jimp.read(buffer);
    const mayor = Math.max(img.width, img.height);
    if (mayor > LADO_MAX) {
        const f = LADO_MAX / mayor;
        img.resize({ w: Math.round(img.width * f), h: Math.round(img.height * f) });
    } else if (mayor < LADO_OBJETIVO) {
        const f = LADO_OBJETIVO / mayor;
        img.resize({ w: Math.round(img.width * f), h: Math.round(img.height * f) });
    }
    img.convolute([[0, -1, 0], [-1, 5, -1], [0, -1, 0]]);
    img.contrast(0.1);
    return await img.getBuffer('image/jpeg');
}

export default {
    command: ['hd', 'remini', 'mejorar'],
    description: 'Mejora la calidad y nitidez de una imagen (responde a una imagen o envíala con .hd)',
    category: 'tools',
    run: async (ctx: any) => {
        const { sock, msg, chat, m } = ctx;
        const responder = (texto: string) => sock.sendMessage(chat, { text: texto }, { quoted: msg });

        const quoted = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imgMsg = m?.message?.imageMessage || quoted?.imageMessage;
        if (!imgMsg) {
            return responder(`˚₊· ͟͟͞͞➳❥ *HD*\n───────────────\n✧ Responde a una imagen con *.hd*\n✦ o envía una imagen con *.hd* como pie.\n───────────────\n> AKAME-MD 🌸`);
        }

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } }).catch(() => null);

            const media = quoted ? { message: quoted } : m;
            const buffer = await downloadMediaMessage(media, 'buffer', {}, {
                logger: P({ level: 'silent' }),
                reuploadRequest: sock.updateMediaMessage
            }).catch(() => null);
            if (!buffer) throw new Error('No pude descargar la imagen');
            const original = Buffer.from(buffer);

            const mime = imgMsg.mimetype || 'image/jpeg';
            const porApi = await mejorarConApi(original, mime);
            const mejorada = porApi ?? await mejorarLocal(original);

            await sock.sendMessage(chat, {
                image: mejorada,
                caption: `˚₊· ͟͟͞͞➳❥ *HD*\n───────────────\n✧ Imagen mejorada\n───────────────\n> AKAME-MD 🌸`
            }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch (e: any) {
            console.log('[HD ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await responder(`✿ No pude mejorar esa imagen. Prueba con otra.`);
        }
    }
};
