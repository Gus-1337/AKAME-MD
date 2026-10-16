import { downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';
import axios from 'axios';
import { Jimp } from 'jimp';
import { createWorker } from 'tesseract.js';
import { stellarUrl } from '../../lib/stellar.ts';
import { preguntarIA, enviarRespuesta, deliriusGptPrompt, siputzx, yosoyyoDeepseek, deliriusGemini, stellarGemini, stellarChatgpt, esNegativa, type Proveedor } from '#ia';

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
// Arranca el OCR al cargar el módulo, para que la primera tarea no espere la descarga de idiomas
const ocrListo: Promise<any> = createWorker('spa+eng')
    .then((w) => { ocr = w; return w; })
    .catch(() => null);

/** OCR local (Tesseract): líneas normales y líneas solo de números y operadores. */
export const leerLineas = async (jpg: Buffer): Promise<{ lineas: string[]; numericas: string[] }> => {
    if (!ocr) ocr = (await ocrListo) || await createWorker('spa+eng');
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

// ---------- Operaciones ----------

type Operacion = { a: number; op: '+' | '-' | '*' | '/'; b: number; r: string };

/** Lee una operación simple al final de la línea, por ejemplo "2x6=" o "12 ÷ 3 =". */
export const parsearOperacion = (t: string): Operacion | null => {
    const n = t.replace(/(\d)\s*[xX×*]\s*(\d)/g, '$1*$2').replace(/[÷:]/g, '/').replace(/\s+/g, '');
    const m = n.match(/(-?\d+(?:[.,]\d+)?)([+\-*\/])(-?\d+(?:[.,]\d+)?)=?$/);
    if (!m) return null;
    const a = Number(m[1].replace(',', '.'));
    const b = Number(m[3].replace(',', '.'));
    const op = m[2] as Operacion['op'];
    if (op === '/' && b === 0) return null;
    const res = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : a / b;
    const r = Number.isInteger(res) ? String(res) : (Math.round(res * 100) / 100).toString();
    return { a, op, b, r };
};

/** Escribe la operación bonita, con su explicación corta en español. */
const explicarOperacion = (o: Operacion): string => {
    const simbolo = { '+': '+', '-': '−', '*': '×', '/': '÷' }[o.op];
    const titulo = `${o.a} ${simbolo} ${o.b} = ${o.r}`;
    let frase: string;
    if (o.op === '*') {
        frase = o.a === 1 ? `Un grupo de ${o.b} suma ${o.r}.` : `${o.a} grupos de ${o.b} suman ${o.r}.`;
    } else if (o.op === '+') frase = `${o.a} más ${o.b} es ${o.r}.`;
    else if (o.op === '-') frase = `${o.a} menos ${o.b} es ${o.r}.`;
    else frase = `${o.a} entre ${o.b} es ${o.r}.`;
    return `• ${titulo}\n  ${frase}`;
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

/** Deja solo la explicación de los ejercicios con texto: quita frases internas del prompt. */
export const limpiarExplicacion = (t: string): string =>
    paraWhatsApp(t)
        .split('\n')
        .filter((l) => !/resultados ya verificados|texto de la tarea|leído de la imagen|indicación del alumno|ejercicios:/i.test(l))
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

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

            // Texto de la imagen: OCR local (imagen de 1000 px); si falla, OCR de Stellar
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
                numericas = [];
            }
            if (!lineas.length) {
                await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
                return sock.sendMessage(chat, { text: '✧ No pude leer texto en esa imagen. Intenta con una foto más clara.' }, { quoted: m });
            }

            // 1) Operaciones: se calculan aquí, en el orden de la hoja (sin inventar nada)
            const fuente = numericas.length ? numericas : lineas;
            const operaciones = fuente.map((t) => parsearOperacion(t)).filter((o): o is Operacion => o !== null);

            // 2) Ejercicios con texto (problemas de palabras): solo esos van a la IA
            const conTexto = lineas.filter((t) => !parsearOperacion(t) && t.length > 12 &&
                /\?|calcula|resuelve|cu[aá]nt|completa|escribe|encuentra|cu[aá]l|problema|compr|reparte|tiene|tenía|hay |suma|resta|multiplica|divide/i.test(t));

            const bloques: string[] = [];
            operaciones.forEach((o, i) => {
                bloques.push(explicarOperacion(o));
                if ((i + 1) % 4 === 0) bloques.push('');
            });
            let cabecera = operaciones.length ? `Encontré *${operaciones.length}* operaciones.\n\n` : '';

            if (conTexto.length) {
                const sistema = 'Eres un profesor paciente. Responde en español, sin emojis, en texto simple.';
                const instruccion = indicacion ? `Indicación del alumno: ${indicacion}.` : 'Resuelve cada ejercicio.';
                const prompt = `${sistema}\n\n${instruccion} Para cada ejercicio escribe una línea "• respuesta" y una explicación corta debajo. Sin LaTeX ni negritas, sin repetir el enunciado.\n\nEjercicios:\n${conTexto.join('\n')}`;
                const alterno = `Ayuda a un estudiante de primaria a entender estos ejercicios escolares. Para cada uno escribe "• respuesta" y una explicación corta debajo. Sin LaTeX.\n\nEjercicios:\n${conTexto.join('\n')}`;
                const proveedores: Proveedor[] = [
                    yosoyyoDeepseek,
                    siputzx('gptoss120b'),
                    deliriusGptPrompt(sistema),
                    stellarGemini,
                    deliriusGemini,
                    stellarChatgpt
                ];
                let texto = '';
                try { ({ texto } = await preguntarIA(proveedores, prompt)); } catch { ({ texto } = await preguntarIA(proveedores, alterno)); }
                if (!esNegativa(texto)) {
                    bloques.push('*Ejercicios con texto*', limpiarExplicacion(texto));
                }
            }

            if (!bloques.length) {
                await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
                return sock.sendMessage(chat, { text: '✧ No encontré operaciones ni ejercicios en esa imagen.' }, { quoted: m });
            }

            const explicacion = (cabecera + bloques.join('\n')).replace(/\n{3,}/g, '\n\n').trim();
            await Promise.all([
                sock.sendMessage(chat, { image: buf, caption: '📚 *TAREA*' }, { quoted: m }),
                enviarRespuesta(sock, chat, m, '📝 *Explicación*', explicacion)
            ]);
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null);
        } catch (e) {
            console.error('[tarea] error:', e);
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude resolver la tarea ahora, intenta de nuevo en un momento.' }, { quoted: m });
        }
    }
};
