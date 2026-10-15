import { downloadMediaMessage } from '@whiskeysockets/baileys';
import P from 'pino';
import { Jimp } from 'jimp';

// Tamaño máximo del lado más largo: más que esto tarda demasiado y WhatsApp no gana calidad
const LADO_MAX = 2048;
// Imágenes que ya son grandes se agrandan menos
const LADO_OBJETIVO = 1600;

/** Agranda y afila la imagen (sin IA: no inventa detalles, mejora nitidez y contraste). */
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
        const esImagen = m?.message?.imageMessage || quoted?.imageMessage;
        if (!esImagen) {
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

            const mejorada = await mejorarLocal(Buffer.from(buffer));

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
