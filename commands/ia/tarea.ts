import { downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import axios from 'axios';
import { Jimp, loadFont, measureText } from 'jimp';
import { SANS_32_BLACK } from 'jimp/fonts';
import { createWorker } from 'tesseract.js';
import { stellarUrl } from '../../lib/stellar.ts';
import { preguntarIA, enviarRespuesta, deliriusGptPrompt, siputzx, yosoyyoDeepseek, deliriusGemini, stellarGemini, stellarChatgpt, type Proveedor } from '#ia';

const NYX_KEY = process.env.NYX_KEY || 'nyx_aOtu2zWUS5jfVwzbtmiDBZAfPZ_xeMTX';

type Linea = { text: string; x1: number; y0: number; y1: number };

// ---------- Subida y OCR ----------

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

/** Texto de la imagen con OCR de Stellar (respaldo si falla el OCR local). */
const leerTextoStellar = async (url: string): Promise<string> => {
    const { data } = await axios.get(stellarUrl('/tools/ocr', { url }), { timeout: 60000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return typeof data?.result === 'string' ? data.result.trim() : '';
};

let ocr: any = null;
/** OCR local con posición de cada línea (Tesseract). */
export const leerLineas = async (jpg: Buffer): Promise<{ lineas: Linea[]; numericas: Linea[] }> => {
    if (!ocr) ocr = await createWorker('spa+eng');
    const extraer = (data: any) => {
        const out: Linea[] = [];
        for (const b of data.blocks || []) for (const p of b.paragraphs) for (const l of p.lines) {
            const t = String(l.text || '').trim();
            if (t) out.push({ text: t, x1: l.bbox.x1, y0: l.bbox.y0, y1: l.bbox.y1 });
        }
        return out;
    };
    // Pasada normal: texto completo de la hoja
    await ocr.setParameters({ tessedit_char_whitelist: '' });
    const normal = await ocr.recognize(jpg, {}, { blocks: true });
    // Pasada solo de números y operadores: evita que el 6 se lea como O
    await ocr.setParameters({ tessedit_char_whitelist: '0123456789x×*+-÷/=:.,?()' });
    const numerica = await ocr.recognize(jpg, {}, { blocks: true });
    await ocr.setParameters({ tessedit_char_whitelist: '' });
    return { lineas: extraer(normal.data), numericas: extraer(numerica.data) };
};

// ---------- Cálculo local y dibujo ----------

/** Resuelve operaciones simples de una línea, por ejemplo "3 x 4 =" o "12 ÷ 3 =". */
export const calcularLinea = (t: string): string | null => {
    const n = t.replace(/(\d)\s*[xX×*]\s*(\d)/g, '$1*$2').replace(/[÷:]/g, '/').replace(/\s+/g, '');
    const m = n.match(/(-?\d+(?:[.,]\d+)?)([+\-*\/])(-?\d+(?:[.,]\d+)?)=?$/);
    if (!m) return null;
    const a = Number(m[1].replace(',', '.'));
    const b = Number(m[3].replace(',', '.'));
    if (m[2] === '/' && b === 0) return null;
    const r = m[2] === '+' ? a + b : m[2] === '-' ? a - b : m[2] === '*' ? a * b : a / b;
    return Number.isInteger(r) ? String(r) : (Math.round(r * 100) / 100).toString();
};

/** Escribe cada respuesta justo después del último signo de la línea (donde está el espacio). */
export const escribirRespuestas = async (base: any, lineas: Linea[], respuestas: Map<number, string>) => {
    const fuente = await loadFont(SANS_32_BLACK);
    for (const [i, r] of respuestas) {
        const l = lineas[i];
        if (!l || !r) continue;
        const ancho = measureText(fuente, r);
        let x = l.x1 + 18;
        if (x + ancho > base.width - 6) x = base.width - ancho - 6;
        const y = Math.max(0, l.y0 + Math.round((l.y1 - l.y0 - 32) / 2));
        base.print({ font: fuente, x, y, text: r });
    }
    return base;
};

/** Respaldo: imagen con la respuesta en un panel debajo, cuando no se pueden ubicar los espacios. */
const panelRespuesta = async (base: any, respuesta: string): Promise<Buffer> => {
    const W = base.width;
    const fuente = await loadFont(SANS_32_BLACK);
    let resumen = respuesta.replace(/\s+/g, ' ').trim();
    if (resumen.length > 420) resumen = resumen.slice(0, 417) + '...';
    const lineas: string[] = [];
    let actual = '';
    for (const palabra of resumen.split(' ')) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (actual && measureText(fuente, prueba) > W - 80) { lineas.push(actual); actual = palabra; } else actual = prueba;
    }
    if (actual) lineas.push(actual);
    const alto = 90 + lineas.length * 44 + 30;
    const lienzo = new Jimp({ width: W, height: base.height + alto, color: 0xffffffff });
    lienzo.composite(base, 0, 0);
    lienzo.composite(new Jimp({ width: W, height: alto, color: 0xe8f1ffff }), 0, base.height);
    let y = base.height + 22;
    lienzo.print({ font: fuente, x: 40, y, text: 'RESPUESTA' });
    y += 56;
    for (const linea of lineas) { lienzo.print({ font: fuente, x: 40, y, text: linea }); y += 44; }
    return await lienzo.getBuffer('image/jpeg');
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

// ---------- Comando ----------

export default {
    command: ['tarea', 'resolver'],
    description: 'Lee una imagen de tarea, la resuelve y escribe las respuestas en la hoja',
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

            // Imagen de trabajo (ancho máximo 1000 px) para OCR y dibujo
            const base: any = await Jimp.read(buf);
            if (base.width > 1000) base.resize({ w: 1000, h: Math.round((base.height * 1000) / base.width) });
            const jpg = await base.getBuffer('image/jpeg');

            let lineas: Linea[] = [];
            let numericas: Linea[] = [];
            try { ({ lineas, numericas } = await leerLineas(jpg)); } catch { lineas = []; }
            const textoPlano = lineas.length ? lineas.map((l) => l.text).join('\n') : await leerTextoStellar(await subirImagen(buf, mime));
            if (!textoPlano.trim()) {
                await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
                return sock.sendMessage(chat, { text: '✧ No pude leer texto en esa imagen. Intenta con una foto más clara.' }, { quoted: m });
            }

            // Una sola consulta: respuestas por línea, separador y explicación
            const listado = (lineas.length ? lineas.map((l) => l.text) : textoPlano.split('\n').filter(Boolean))
                .map((t, i) => `${i}: ${t}`).join('\n');
            const sistema = 'Eres un profesor paciente. Responde en español, sin emojis.';
            const instruccion = indicacion ? `Indicación del alumno: ${indicacion}.` : 'Resuelve toda la tarea.';
            const prompt = `${sistema}\n\n${instruccion}\n` +
                'Te paso las líneas numeradas de una hoja de tarea. Primero escribe una respuesta por cada línea que pida un resultado, con este formato exacto: "número: respuesta" (solo la respuesta corta, sin explicación). No escribas las líneas que no piden nada. Luego escribe una línea que diga --- y después la explicación paso a paso con la respuesta final.\n\n' +
                `Líneas:\n${listado}`;

            const proveedores: Proveedor[] = [
                yosoyyoDeepseek,
                siputzx('gptoss120b'),
                deliriusGptPrompt(sistema),
                stellarGemini,
                deliriusGemini,
                stellarChatgpt
            ];
            const { texto: respuesta } = await preguntarIA(proveedores, prompt);

            const [parteRespuestas, ...resto] = respuesta.split(/\n\s*-{3,}\s*\n?/);
            const explicacion = paraWhatsApp(resto.length ? resto.join('\n') : respuesta);

            // Respuestas por línea: primero las de la IA, luego las calculadas localmente (más confiables)
            const respuestas = new Map<number, string>();
            for (const r of parteRespuestas.matchAll(/^\s*(\d+)\s*[:.)-]\s*(.+)$/gm)) {
                const i = Number(r[1]);
                const valor = r[2].trim().replace(/\*+/g, '').slice(0, 30);
                if (i < listado.split('\n').length && valor && !/no puedo|no aplica|^-$/i.test(valor)) respuestas.set(i, valor);
            }
            lineas.forEach((l, i) => {
                // Busca la línea numérica en la misma altura (se traslapa al menos la mitad)
                const altura = l.y1 - l.y0;
                const par = numericas.find((n) => Math.min(n.y1, l.y1) - Math.max(n.y0, l.y0) > altura / 2);
                const c = calcularLinea(par ? par.text : l.text);
                if (c !== null) respuestas.set(i, c);
            });

            // Imagen resuelta: respuestas escritas en la hoja, o panel si no se ubicaron
            let imagen: Buffer | null = null;
            try {
                if (lineas.length && respuestas.size) {
                    imagen = await (await escribirRespuestas(base, lineas, respuestas)).getBuffer('image/jpeg');
                } else {
                    imagen = await panelRespuesta(base, explicacion);
                }
            } catch { imagen = null; }

            if (imagen) await sock.sendMessage(chat, { image: imagen, caption: '📚 *TAREA RESUELTA*' }, { quoted: m });
            await enviarRespuesta(sock, chat, m, '📝 *Explicación*', explicacion);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude resolver la tarea ahora, intenta de nuevo en un momento.' }, { quoted: m });
        }
    }
};
