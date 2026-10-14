import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

// Diagnóstico de comandos (solo owner).
// 1) Revisa que cada archivo de comando cargue sin error.
// 2) Revisa que las APIs que usa cada comando respondan.

const LIMITE_URLS = 150;
const CONCURRENCIA = 4;
const TIMEOUT_MS = 8000;
const MAX_CARACTERES = 3300;
const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

// Solo se revisan APIs: el host debe contener "api" o "nyx".
// Así se ignoran páginas normales (YouTube, MediaFire, miniaturas, etc.)
const esApi = (host: string) => /api|nyx/i.test(host);

function listarArchivos(dir: string): string[] {
    const salida: string[] = [];
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) salida.push(...listarArchivos(full));
        else if (f.endsWith('.ts') && !f.startsWith('_')) salida.push(full);
    }
    return salida;
}

const nombreComando = (src: string) => {
    const m = src.match(/command:\s*\[\s*['"`]([^'"`]+)['"`]/);
    return m ? m[1] : null;
};

// Saca los enlaces http(s) del código fuente. Si el enlace tiene partes variables (${...}), se corta ahí.
function extraerUrls(src: string): string[] {
    const encontrados = new Set<string>();
    const re = /https?:\/\/[^\s'"`<>)\\]+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
        let url = m[0];
        const corte = url.indexOf('${');
        if (corte !== -1) url = url.slice(0, corte);
        url = url.replace(/[;,]+$/, '');
        let host = '';
        try {
            const u = new URL(url);
            host = u.hostname;
            if (!host.includes('.') || host.endsWith('.')) continue;
        } catch { continue; }
        if (!esApi(host)) continue;
        encontrados.add(url);
    }
    return [...encontrados];
}

async function probar(url: string): Promise<{ ok: boolean; motivo: string }> {
    try {
        const res = await fetch(url, {
            method: 'GET',
            redirect: 'follow',
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        try { await res.body?.cancel(); } catch {}
        const s = res.status;
        // 400/422: la API responde pero faltan parámetros (normal al probar sin datos)
        // 401: pide clave; el comando sí la envía, así que no es un fallo
        // 429: la API está viva, solo limita el uso de nuestra prueba
        if (s < 400 || [400, 401, 422, 429].includes(s)) return { ok: true, motivo: '' };
        if (s === 403) return { ok: false, motivo: 'bloqueado (403)' };
        if (s === 404) return { ok: false, motivo: 'ruta no existe (404)' };
        if (s === 429) return { ok: false, motivo: 'límite de uso (429)' };
        if (s === 451) return { ok: false, motivo: 'no disponible (451)' };
        if (s >= 500) return { ok: false, motivo: `servidor caído (${s})` };
        return { ok: false, motivo: `respuesta ${s}` };
    } catch (e: any) {
        const t = `${e?.name || ''} ${e?.cause?.code || ''} ${e?.message || ''}`;
        if (/Timeout|Abort/i.test(t)) return { ok: false, motivo: 'tarda demasiado' };
        if (/ENOTFOUND|EAI_AGAIN/i.test(t)) return { ok: false, motivo: 'dominio no encontrado' };
        if (/ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENETUNREACH/i.test(t)) return { ok: false, motivo: 'sin conexión' };
        return { ok: false, motivo: 'error de conexión' };
    }
}

async function enLotes<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
    const out: R[] = new Array(items.length);
    let i = 0;
    await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
        while (i < items.length) {
            const idx = i++;
            out[idx] = await fn(items[idx]);
        }
    }));
    return out;
}

export default {
    command: ['error', 'diagnostico', 'salud'],
    description: 'Revisa qué comandos fallan y por qué (solo owner)',
    category: 'owner',
    owner: true,
    run: async ({ chat, m, sock }: any) => {
        const inicio = Date.now();
        await sock.sendMessage(chat, { text: '🩺 Revisando comandos y APIs, espera un momento...' }, { quoted: m });

        const raiz = path.join(process.cwd(), 'commands');
        const archivos = listarArchivos(raiz);

        const erroresCarga: string[] = [];
        const urlsPorComando = new Map<string, Set<string>>();
        let comandos = 0;

        for (const file of archivos) {
            const rel = path.relative(raiz, file).replace(/\\/g, '/');
            const src = fs.readFileSync(file, 'utf8');
            const nombre = nombreComando(src) || rel;

            try {
                const mod: any = await import(pathToFileURL(file).href + `?diag=${Date.now()}`);
                const cmd = mod.default || mod;
                if (!cmd || typeof cmd.run !== 'function') erroresCarga.push(`› ${nombre} — no tiene función run`);
                comandos++;
            } catch (e: any) {
                const msg = String(e?.message || e).split('\n')[0].slice(0, 90);
                erroresCarga.push(`› ${nombre} — no carga: ${msg}`);
            }

            const urls = extraerUrls(src);
            if (urls.length) {
                if (!urlsPorComando.has(nombre)) urlsPorComando.set(nombre, new Set());
                urls.forEach(u => urlsPorComando.get(nombre)!.add(u));
            }
        }

        // Une cada URL con los comandos que la usan
        const porUrl = new Map<string, string[]>();
        for (const [cmd, set] of urlsPorComando) {
            for (const u of set) {
                if (!porUrl.has(u)) porUrl.set(u, []);
                porUrl.get(u)!.push(cmd);
            }
        }
        const urls = [...porUrl.keys()].slice(0, LIMITE_URLS);
        const resultados = await enLotes(urls, CONCURRENCIA, probar);

        const fallosApi: string[] = [];
        urls.forEach((u, i) => {
            const r = resultados[i];
            if (r.ok) return;
            const host = u.replace(/^https?:\/\//, '').split('/')[0];
            const cmds = porUrl.get(u)!.map(c => `.${c.replace(/\.ts$/, '')}`).join(', ');
            fallosApi.push(`› ${cmds}\n   ${host} → ${r.motivo}`);
        });

        const segundos = ((Date.now() - inicio) / 1000).toFixed(1);
        const total = erroresCarga.length + fallosApi.length;

        let txt =
            `🩺 *DIAGNÓSTICO DE COMANDOS* 🩺\n` +
            `${LINEA}\n` +
            `✔ Archivos revisados » *${comandos}*\n` +
            `✔ APIs probadas » *${urls.length}*\n` +
            `✖ Con problemas » *${total}*\n` +
            `⏱ Tiempo » *${segundos}s*\n`;

        if (total === 0) {
            txt += `${LINEA}\n✔ Todo funciona bien, no encontré fallos.`;
            return sock.sendMessage(chat, { text: txt }, { quoted: m });
        }

        if (erroresCarga.length) {
            txt += `${LINEA}\n*⚠ Comandos que no cargan:*\n${erroresCarga.join('\n')}\n`;
        }
        if (fallosApi.length) {
            txt += `${LINEA}\n*🌐 APIs con problema:*\n${fallosApi.join('\n')}\n`;
        }

        if (txt.length > MAX_CARACTERES) {
            txt = txt.slice(0, MAX_CARACTERES) + '\n… (hay más fallos, revisa la consola)';
        }

        return sock.sendMessage(chat, { text: txt }, { quoted: m });
    }
};
