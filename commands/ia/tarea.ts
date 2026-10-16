import { downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import axios from 'axios';
import { Jimp } from 'jimp';
import { createWorker } from 'tesseract.js';
import { stellarUrl } from '../../lib/stellar.ts';
import { preguntarIA, enviarRespuesta, deliriusGptPrompt, siputzx, yosoyyoDeepseek, deliriusGemini, stellarGemini, stellarChatgpt, type Proveedor } from '#ia';

const NYX_KEY = process.env.NYX_KEY || 'nyx_aOtu2zWUS5jfVwzbtmiDBZAfPZ_xeMTX';

// ---------- Subida y OCR ----------

/** Sube la imagen a NyxDLaPI y, si falla, a Telegraph. Sólo se usa si el OCR local falla. */
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

/** Texto de la imagen con OCR de Stellar (respaldo). */
const leerTextoStellar = async (url: string): Promise<string> => {
    const { data } = await axios.get(stellarUrl('/tools/ocr', { url }), { timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return typeof data?.result === 'string' ? data.result.trim() : '';
};

let ocr: any = null;
/** OCR local (Tesseract): devuelve las líneas de texto de la imagen. */
const leerLineas = async (jpg: Buffer): Promise<{ lineas: string[]; numericas: string[] }> => {
    if (!ocr) ocr = await createWorker('spa+eng');
    const extraer = (data: any) => {
        const out: string[] = [];
        for (const b of data.blocks || []) for (const p of b.paragraphs) for (const l of p.lines) {
            const t = String(l.text || '').trim();
            if (t) out.push(t);
        }
        return out;
    };
    await ocr.setParameters({ tessedit_char_whitelist: '' });
    const normal = await ocr.recognize(jpg, {}, { blocks: true });
    // Solo números y operadores: evita que el 6 se lea como O
    await ocr.setParameters({ tessedit_char_whitelist: '0123456789x×*+-÷/=:.,?()' });
    const numerica = await ocr.recognize(jpg, {}, { blocks: true });
    await ocr.setParameters({ tessedit_char_whitelist: '' });
    return { lineas: extraer(normal.data), numericas: extraer(numerica.data) };
};

/** Resuelve operaciones simples de una línea, por ejemplo "3 x 4 =" o "12 ÷ 3 =". */
const calcularLinea = (t: string): string | null => {
    const n = t.replace(/(\d)\s*[xX×*]\s*(\d)/g, '$1*$2').replace(/[÷:]/g, '/').replace(/\s+/g, '');
    const m = n.match(/(-?\d+(?:[.,]\d+)?)([+\-*\/])(-?\d+(?:[.,]\d+)?)=?$/);
    if (!m) return null;
    const a = Number(m[1].replace(',', '.'));
    const b = Number(m[3].replace(',', '.'));
    if (m[2] === '/' && b === 0) return null;
    const r = m[2] === '+' ? a + b : m[2] === '-' ? a - b : m[2] === '*' ? a * b : a / b;
    return Number.isInteger(r) ? String(r) : (Math.round(r * 100) / 100).toString();
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

/** Deja solo la explicación: quita frases internas del prompt y resalta la respuesta final. */
export const limpiarExplicacion = (t: string): string => {
    const lim = paraWhatsApp(t)
        .split('\n')
        .filter((l) => !/resultados ya verificados|texto de la tarea|leído de la imagen|indicación del alumno/i.test(l))
        .join('\n')
        .replace(/^(respuesta final\s*:?)\s*/gim, '*$1* ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return lim || 'No pude armar la explicación. Intenta de nuevo.';
};

// ---------- Comando ----------

export default {
    command: ['tarea', 'resolver'],
    description: 'Lee una imagen de tarea y da la explicación paso a paso',
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

            // La imagen limpia sale en cuanto se descarga, sin esperar a la IA
            await sock.sendMessage(chat, { image: buf, caption: '📚 *TAREA*' }, { quoted: m }).catch(() => null);

            // Texto de la imagen: OCR local (rápido, con imagen de 1000 px); si falla, OCR de Stellar
            let lineas: string[] = [];
            let numericas: string[] = [];
            try {
                const base: any = await Jimp.read(buf);
                if (base.width > 1000) base.resize({ w: 1000, h: Math.round((base.height * 1000) / base.width) });
                ({ lineas, numericas } = await leerLineas(await base.getBuffer('image/jpeg')));
            } catch { lineas = []; }
            if (!lineas.length) {
                const texto = await leerTextoStellar(await subirImagen(buf, mime));
                lineas = texto.split('\n').map((t) => t.trim()).filter(Boolean);
            }
            if (!lineas.length) {
                await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
                return sock.sendMessage(chat, { text: '✧ No pude leer texto en esa imagen. Intenta con una foto más clara.' }, { quoted: m });
            }

            // Operaciones simples se calculan aquí, para que la IA no se equivoque
            const pistas = (numericas.length ? numericas : lineas)
                .map((t) => ({ t, c: calcularLinea(t) }))
                .filter((x) => x.c !== null)
                .map((x) => `${x.t} ${x.c}`)
                .join('\n');

            const sistema = 'Eres un profesor paciente. Responde en español, sin emojis, en texto simple.';
            const instruccion = indicacion ? `Indicación del alumno: ${indicacion}.` : 'Resuelve toda la tarea.';
            const prompt = `${sistema}\n\n${instruccion} Explica paso a paso cómo resolver cada ejercicio y termina con la respuesta final clara, sin formato LaTeX.` +
                (pistas ? `\nResultados ya verificados:\n${pistas}` : '') +
                `\n\nTexto de la tarea (leído de la imagen):\n${lineas.join('\n')}`;

            const proveedores: Proveedor[] = [
                yosoyyoDeepseek,
                siputzx('gptoss120b'),
                deliriusGptPrompt(sistema),
                stellarGemini,
                deliriusGemini,
                stellarChatgpt
            ];
            const { texto } = await preguntarIA(proveedores, prompt);
            console.log('[tarea] explicación:', texto.length, 'caracteres');

            await enviarRespuesta(sock, chat, m, '📝 *Explicación*', limpiarExplicacion(texto));
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude resolver la tarea ahora, intenta de nuevo en un momento.' }, { quoted: m });
        }
    }
};
