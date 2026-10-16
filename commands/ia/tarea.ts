import { downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import axios from 'axios';
import { Jimp, loadFont, measureText } from 'jimp';
import { SANS_32_BLACK } from 'jimp/fonts';
import { stellarUrl } from '../../lib/stellar.ts';
import { preguntarIA, enviarRespuesta, deliriusGptPrompt, siputzx, yosoyyoDeepseek, deliriusGemini, stellarGemini, stellarChatgpt, type Proveedor } from '#ia';

const NYX_KEY = process.env.NYX_KEY || 'nyx_aOtu2zWUS5jfVwzbtmiDBZAfPZ_xeMTX';

/**
 * Arma la imagen resuelta: la foto de la tarea con un panel debajo
 * que muestra la respuesta final.
 */
export const imagenResuelta = async (original: Buffer, respuesta: string): Promise<Buffer> => {
    const W = 900;
    const base = await Jimp.read(original);
    base.resize({ w: W, h: Math.round((base.height * W) / base.width) });

    const fuente = await loadFont(SANS_32_BLACK);
    const idx = respuesta.search(/respuesta final/i);
    let resumen = (idx >= 0 ? respuesta.slice(idx).replace(/^respuesta final\W*/i, '') : respuesta.slice(-400))
        .replace(/\s+/g, ' ').trim();
    if (resumen.length > 420) resumen = resumen.slice(0, 417) + '...';

    // Ajusta el texto al ancho del panel
    const lineas: string[] = [];
    let actual = '';
    for (const palabra of resumen.split(' ')) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (actual && measureText(fuente, prueba) > W - 80) {
            lineas.push(actual);
            actual = palabra;
        } else {
            actual = prueba;
        }
    }
    if (actual) lineas.push(actual);

    const alto = 90 + lineas.length * 44 + 30;
    const lienzo = new Jimp({ width: W, height: base.height + alto, color: 0xffffffff });
    lienzo.composite(base, 0, 0);
    const panel = new Jimp({ width: W, height: alto, color: 0xe8f1ffff });
    lienzo.composite(panel, 0, base.height);

    let y = base.height + 22;
    lienzo.print({ font: fuente, x: 40, y, text: 'RESPUESTA' });
    y += 56;
    for (const linea of lineas) {
        lienzo.print({ font: fuente, x: 40, y, text: linea });
        y += 44;
    }
    return await lienzo.getBuffer('image/jpeg');
};

/** Sube la imagen a NyxDLaPI (enlace permanente) y, si falla, a Telegraph. */
const subirImagen = async (buf: Buffer, mime: string): Promise<string> => {
    const ext = mime.split('/')[1] || 'jpg';
    try {
        const form = new FormData();
        form.append('files', new Blob([new Uint8Array(buf)], { type: mime }), `tarea.${ext}`);
        const res = await fetch('https://nyxdlapi.vercel.app/api/tools/tourl', {
            method: 'POST', body: form, headers: { 'X-API-Key': NYX_KEY, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(30000)
        });
        const data: any = await res.json().catch(() => null);
        const url: string | undefined = data?.result?.files?.[0]?.url;
        if (res.ok && url) return url;
    } catch { /* sigue con el respaldo */ }
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buf)], { type: mime }), `tarea.${ext}`);
    const res = await fetch('https://telegra.ph/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
    const data: any = await res.json().catch(() => null);
    const src = Array.isArray(data) ? data[0]?.src : data?.src;
    if (!res.ok || !src) throw new Error('no se pudo subir la imagen');
    return `https://telegra.ph${src}`;
};

/** Quita el formato LaTeX y de Markdown que WhatsApp no muestra bien. */
const paraWhatsApp = (t: string) =>
    t.replace(/\\\[|\\\]|\\\(|\\\)/g, '')
        .replace(/\\boxed\{([^}]*)\}/g, '$1')
        .replace(/\\times/g, '×').replace(/\\cdot/g, '·').replace(/\\div/g, '÷')
        .replace(/^#{1,6}\s*(.+)$/gm, '*$1*')
        .replace(/\*\*(.+?)\*\*/g, '*$1*')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

/** Lee el texto de la imagen con OCR de Stellar. */
const leerTexto = async (url: string): Promise<string> => {
    const { data } = await axios.get(stellarUrl('/tools/ocr', { url }), { timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return typeof data?.result === 'string' ? data.result.trim() : '';
};

export default {
    command: ['tarea', 'resolver'],
    description: 'Lee una imagen de tarea y da la respuesta',
    category: 'ia',
    run: async ({ chat, m, sock, args, usedPrefix }: any) => {
        const p = usedPrefix || '.';
        const ctx = m?.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        const imgMsg = m?.message?.imageMessage || quoted?.imageMessage;
        const indicacion = (args || []).join(' ').trim();

        if (!imgMsg) {
            return sock.sendMessage(chat, {
                text: `✧ Envía o responde a una *imagen* de la tarea con *${p}tarea*\n✦ Puedes agregar una indicación, por ejemplo: *${p}tarea explica el paso 2*`
            }, { quoted: m });
        }

        const mime = imgMsg.mimetype || 'image/jpeg';
        const esDirecta = !!m?.message?.imageMessage;
        const origen = esDirecta
            ? { key: m.key, message: m.message }
            : { key: { remoteJid: chat, id: ctx.stanzaId, participant: ctx.participant }, message: quoted };

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => null);

            const buf = await downloadMediaMessage(origen as any, 'buffer', {}, {
                logger: pino({ level: 'silent' }),
                reuploadRequest: sock.updateMediaMessage
            }) as Buffer;

            const url = await subirImagen(buf, mime);
            const texto = await leerTexto(url);
            if (!texto) {
                await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
                return sock.sendMessage(chat, { text: '✧ No pude leer texto en esa imagen. Intenta con una foto más clara.' }, { quoted: m });
            }

            const sistema = 'Eres un profesor paciente. Responde en español.';
            const instruccion = indicacion
                ? `Indicación del alumno: ${indicacion}.`
                : 'Resuelve toda la tarea.';
            const prompt = `${sistema}\n\n${instruccion} Resuelve paso a paso y termina con la respuesta final clara. Si hay varias preguntas, responde todas. Sin emojis.\n\nTexto de la tarea (leído de la imagen):\n${texto}`;

            const proveedores: Proveedor[] = [
                yosoyyoDeepseek,
                siputzx('gptoss120b'),
                deliriusGptPrompt(sistema),
                stellarGemini,
                deliriusGemini,
                stellarChatgpt
            ];
            const { texto: respuesta } = await preguntarIA(proveedores, prompt);

            const limpia = paraWhatsApp(respuesta);
            try {
                const img = await imagenResuelta(buf, limpia);
                await sock.sendMessage(chat, { image: img, caption: '📚 *TAREA RESUELTA*' }, { quoted: m });
            } catch {
                // Si falla la imagen, igual se manda la explicación en texto
            }
            await enviarRespuesta(sock, chat, m, '📝 *Explicación*', limpia);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude resolver la tarea ahora, intenta de nuevo en un momento.' }, { quoted: m });
        }
    }
};
