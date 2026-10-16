import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// .codefile: convierte código que pegas en el chat (o un mensaje citado) en un archivo.
// Owner: `.codefile play` manda el archivo del comando play.
// Usa el texto completo del mensaje (body) para conservar saltos de línea y símbolos.

const MAX_CHARS = 5 * 1024 * 1024; // 5 MB de texto
// Carpeta commands/ según la ubicación de este archivo (no depende de desde dónde se inicie el bot)
const CARPETA_COMANDOS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const EXTENSIONES: Record<string, string> = {
    js: 'js', javascript: 'js', mjs: 'js', cjs: 'js',
    ts: 'ts', typescript: 'ts',
    py: 'py', python: 'py',
    html: 'html', htm: 'html', css: 'css',
    json: 'json', sql: 'sql', php: 'php', java: 'java',
    c: 'c', cpp: 'cpp', 'c++': 'cpp', cs: 'cs', csharp: 'cs',
    go: 'go', rs: 'rs', rust: 'rs', rb: 'rb', ruby: 'rb',
    sh: 'sh', bash: 'sh', yaml: 'yaml', yml: 'yaml', md: 'md', markdown: 'md', xml: 'xml'
};

type Hallado = { ruta: string; contenido: string };

/** Recorre commands/ y devuelve el archivo que define el comando pedido. */
const buscarComando = (nombre: string): Hallado | null => {
    const buscado = nombre.toLowerCase();
    const recorrer = (dir: string): Hallado | null => {
        for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
            const ruta = path.join(dir, entrada.name);
            if (entrada.isDirectory()) {
                const dentro = recorrer(ruta);
                if (dentro) return dentro;
                continue;
            }
            if (!entrada.name.endsWith('.ts')) continue;
            const contenido = fs.readFileSync(ruta, 'utf8');
            const bloque = contenido.match(/command:\s*\[([^\]]*)\]/);
            if (!bloque) continue;
            const nombres = [...bloque[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1].toLowerCase());
            if (nombres.includes(buscado)) return { ruta, contenido };
        }
        return null;
    };
    try { return recorrer(CARPETA_COMANDOS); } catch { return null; }
};

/** Quita las cercas ``` si las trae y toma el lenguaje que indican. */
const quitarCercas = (t: string): { codigo: string; lenguaje: string } => {
    const m = t.match(/^```([\w+#-]*)\s*\n([\s\S]*?)\n?```\s*$/);
    if (m) return { codigo: m[2], lenguaje: m[1].toLowerCase() };
    return { codigo: t, lenguaje: '' };
};

/** Adivina la extensión por el contenido cuando no hay lenguaje indicado. */
const detectar = (c: string): string => {
    const t = c.trimStart();
    if (/^<!doctype html|^<html/i.test(t)) return 'html';
    if (/^<\?php/.test(t)) return 'php';
    if (/^<\?xml/.test(t)) return 'xml';
    if (/^[{[]/.test(t)) { try { JSON.parse(c); return 'json'; } catch { /* no es json */ } }
    if (/^\s*(select|insert|update|delete|create|alter|drop)\s/i.test(t)) return 'sql';
    if (/^#!.*\b(bash|sh)\b/.test(t)) return 'sh';
    if (/^\s*def\s+\w+\(|^\s*class\s+\w+(\(.*\))?:\s*$/m.test(t)) return 'py';
    if (/^(import|from)\s+[\w.]+/m.test(t) && /:\s*$/m.test(t)) return 'py';
    if (/^\s*(public|private|protected)\s+(static\s+)?(class|void|int|String)\b/m.test(t)) return 'java';
    if (/#include\s*[<"]/.test(t)) return 'c';
    if (/^\s*package\s+main\b|\bfunc\s+\w+\(/m.test(t)) return 'go';
    if (/\b(const|let|var|function|require\(|module\.exports|=>|console\.log)\b/.test(t)) {
        return /:\s*(string|number|boolean)\b|\binterface\s+\w+|\btype\s+\w+\s*=/.test(t) ? 'ts' : 'js';
    }
    return 'txt';
};

/** Texto del mensaje citado, si lo hay. */
const textoCitado = (m: any): string => {
    const q = m?.quoted;
    return String(
        q?.text || q?.body ||
        q?.message?.conversation ||
        q?.message?.extendedTextMessage?.text ||
        q?.message?.imageMessage?.caption || ''
    );
};

const cabecera = '╭─────────────────╮\n   ✧ *CODE FILE* ✧\n╰─────────────────╯\n\n';
const pie = '\n\n⋆ AKAME-MD ⋆';

export default {
    command: ['codefile'],
    description: 'Convierte código del chat en un archivo',
    category: 'tools',
    run: async (ctx: any) => {
        const { sock, msg, m, chat, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const cuerpo = String(ctx.body || '');
        // Todo lo que va después del comando (con sus saltos de línea)
        const sinComando = cuerpo.replace(/^\S+\s*/, '');
        const pegado = sinComando.trim() ? sinComando : textoCitado(m || msg);
        const bruto = pegado.replace(/\r\n/g, '\n').replace(/\s+$/, '');

        // Owner: nombre de un comando del bot -> manda su archivo
        const nombre = bruto.trim();
        if ((ctx.owner || ctx.isOwner) && /^[\w-]{1,40}$/.test(nombre)) {
            const hallado = buscarComando(nombre);
            if (!hallado) {
                return sock.sendMessage(chat, { text: `✧ No encontré el comando *${nombre}*.` }, { quoted: msg });
            }
            const archivo = path.basename(hallado.ruta);
            return sock.sendMessage(chat, {
                document: Buffer.from(hallado.contenido, 'utf8'),
                mimetype: 'text/plain',
                fileName: archivo,
                caption: cabecera +
                    `❖ *Comando:* ${nombre}\n` +
                    `✦ *Archivo:* ${archivo}\n` +
                    `✦ *Líneas:* ${hallado.contenido.split('\n').length}` + pie
            }, { quoted: msg });
        }

        if (!bruto.trim()) {
            return sock.sendMessage(chat, {
                text: cabecera + `❖ Usa: *${p}codefile <tu código>*\n✦ O responde a un mensaje con código y escribe *${p}codefile*` + pie
            }, { quoted: msg });
        }
        if (bruto.length > MAX_CHARS) {
            return sock.sendMessage(chat, { text: '✧ El código es demasiado grande (máximo 5 MB de texto).' }, { quoted: msg });
        }

        try {
            const { codigo, lenguaje } = quitarCercas(bruto);
            const ext = (lenguaje && EXTENSIONES[lenguaje]) || (lenguaje && /^[a-z0-9]{1,6}$/.test(lenguaje) ? lenguaje : '') || detectar(codigo);
            const nombreArchivo = `codigo.${ext}`;

            await sock.sendMessage(chat, {
                document: Buffer.from(codigo, 'utf8'),
                mimetype: 'text/plain',
                fileName: nombreArchivo,
                caption: cabecera +
                    `❖ *Archivo:* ${nombreArchivo}\n` +
                    `✦ *Líneas:* ${codigo.split('\n').length}` + pie
            }, { quoted: msg });
        } catch (e: any) {
            console.log('[CODEFILE ERROR]', e?.message);
            await sock.sendMessage(chat, { text: '✧ No pude crear el archivo, intenta de nuevo.' }, { quoted: msg });
        }
    }
};
