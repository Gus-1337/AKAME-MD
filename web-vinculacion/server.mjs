// Servidor para Render: sirve la página de vinculación y reenvía las peticiones
// al bot (que corre en HiddenCloud con un túnel de Cloudflare).
// El bot avisa su link nuevo con POST /api/registrar y la clave SECRETO.
import http from 'node:http';

const PUERTO = Number(process.env.PORT || 10000);
const SECRETO = process.env.SECRETO || '';
const VIGENCIA_MS = 10 * 60 * 1000; // si el bot no avisa en 10 min, se considera apagado

let destino = '';
let visto = 0;

const leer = (req) => new Promise((ok, no) => {
    const partes = [];
    let total = 0;
    req.on('data', (d) => {
        total += d.length;
        if (total > 2_000_000) { no(new Error('demasiado grande')); req.destroy(); return; }
        partes.push(d);
    });
    req.on('end', () => ok(Buffer.concat(partes)));
    req.on('error', no);
});

const botActivo = () => !!destino && Date.now() - visto < VIGENCIA_MS;

const esperaHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="8"><title>AKAME-MD · Despertando</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:linear-gradient(160deg,#ffd6e8,#e8d6ff 50%,#d6ecff);color:#4a2a5a">
<div style="text-align:center;padding:24px">
<div style="font-size:52px">✿</div>
<h2 style="margin:8px 0">El bot está despertando…</h2>
<p>Esta página se actualiza sola en unos segundos ♡</p>
</div></body></html>`;

const responderJson = (res, codigo, obj) => {
    res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj));
};

const servidor = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url || '/', 'http://localhost');

        // El bot registra su link de túnel
        if (req.method === 'POST' && url.pathname === '/api/registrar') {
            if (!SECRETO || req.headers['x-secreto'] !== SECRETO) return responderJson(res, 401, { error: 'no autorizado' });
            let datos;
            try { datos = JSON.parse((await leer(req)).toString()); } catch { return responderJson(res, 400, { error: 'datos inválidos' }); }
            let link;
            try { link = new URL(String(datos?.url || '')); } catch { return responderJson(res, 400, { error: 'link inválido' }); }
            if (link.protocol !== 'https:') return responderJson(res, 400, { error: 'el link debe ser https' });
            destino = link.origin;
            visto = Date.now();
            return responderJson(res, 200, { ok: true });
        }

        if (!botActivo()) {
            if (url.pathname.startsWith('/api/')) return responderJson(res, 503, { error: 'El bot está despertando. Intenta en unos segundos.' });
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            return res.end(esperaHtml);
        }

        // Todo lo demás se reenvía al bot
        const cuerpo = ['GET', 'HEAD'].includes(req.method) ? undefined : await leer(req);
        const r = await fetch(destino + (req.url || '/'), {
            method: req.method,
            headers: { 'Content-Type': req.headers['content-type'] || 'application/json' },
            body: cuerpo && cuerpo.length ? cuerpo : undefined,
            redirect: 'manual',
            signal: AbortSignal.timeout(60000)
        });
        const buffer = Buffer.from(await r.arrayBuffer());
        res.writeHead(r.status, {
            'Content-Type': r.headers.get('content-type') || 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store'
        });
        res.end(buffer);
    } catch (e) {
        console.log('[RENDER] error:', e?.message);
        if (!res.headersSent) responderJson(res, 502, { error: 'No pude hablar con el bot. Intenta de nuevo.' });
    }
});

servidor.listen(PUERTO, '0.0.0.0', () => console.log(`[RENDER] página de vinculación en el puerto ${PUERTO}`));
