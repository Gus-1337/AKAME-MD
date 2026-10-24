import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { crearSubbot, buscarSubbot, borrarSubbot } from '../../lib/subbots.ts';

// Página web para vincular un subbot con el código de 8 dígitos (sin entrar al chat).
// No es un comando: levanta el servidor y un túnel público de Cloudflare al arrancar el bot.
const PUERTO = Number(process.env.SERVER_PORT || process.env.PORT || 24588);
const ESPERA_MS = 5 * 60 * 1000; // 1 código cada 5 minutos por número
const ultimoPedido = new Map<string, number>();

const CARPETA_BIN = path.resolve(process.cwd(), '.cloudflared');
const BIN_CLOUDFLARED = path.join(CARPETA_BIN, 'cloudflared');
const URL_DESCARGA = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64';
const REGEX_LINK = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
// Si la página vive en Render, el bot le avisa su link de túnel (ver web-vinculacion/README.md)
const REGISTRO_URL = process.env.VINCULAR_REGISTRO_URL || '';
const REGISTRO_SECRETO = process.env.VINCULAR_SECRETO || '';

const PAGINA = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AKAME-MD · Vincular subbot</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#4a2a5a;
  background:linear-gradient(160deg,#ffd6e8 0%,#e8d6ff 45%,#d6ecff 100%);background-attachment:fixed;padding:18px 12px 40px;position:relative;overflow-x:hidden}
.flor{position:fixed;font-size:18px;opacity:.35;animation:subir 9s linear infinite;pointer-events:none;bottom:-40px}
@keyframes subir{to{transform:translateY(-110vh) rotate(360deg)}}
.wrap{max-width:460px;margin:0 auto;position:relative;z-index:1}
.logo{text-align:center;margin:6px 0 14px}
.logo .t{font-size:26px;font-weight:800;background:linear-gradient(90deg,#ff5fa2,#9b6bff,#4fb3ff);-webkit-background-clip:text;background-clip:text;color:transparent}
.logo .s{font-size:13px;color:#8a5fa0;letter-spacing:.5px}
.card{background:rgba(255,255,255,.92);border-radius:24px;box-shadow:0 12px 32px rgba(140,70,160,.18);padding:20px;margin-bottom:14px;border:2px solid #fff}
.card h2{font-size:17px;margin:0 0 10px;color:#7a3fa0}
.badge{display:inline-block;font-size:12px;padding:4px 10px;border-radius:999px;background:#e8f7ec;color:#2e7d32;font-weight:700}
.badge.wait{background:#fff4d6;color:#8a6100}
.link{display:flex;gap:8px;align-items:center;background:#f6f0ff;border:2px dashed #c9a6ff;border-radius:14px;padding:10px;margin-top:8px}
.link code{flex:1;font-size:12px;word-break:break-all;color:#5a2d86}
.pill{border:0;border-radius:10px;background:#9b6bff;color:#fff;font-size:12px;font-weight:700;padding:8px 10px;cursor:pointer;white-space:nowrap}
.pasos{list-style:none;padding:0;margin:0;counter-reset:p}
.pasos li{counter-increment:p;display:flex;gap:10px;align-items:flex-start;margin:8px 0;font-size:14px;line-height:1.45}
.pasos li:before{content:counter(p);min-width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#ff8fc0,#9b6bff);color:#fff;font-weight:800;font-size:13px;display:flex;align-items:center;justify-content:center}
label{font-size:13px;font-weight:700;color:#7a3fa0}
input{width:100%;padding:13px;border:2px solid #f4b6d6;border-radius:14px;font-size:17px;margin:8px 0 4px;outline:none;background:#fff}
input:focus{border-color:#9b6bff}
.ayuda{font-size:12px;color:#8a7a99;margin-bottom:10px}
button.main{width:100%;padding:14px;border:0;border-radius:16px;background:linear-gradient(90deg,#ff8fc0,#9b6bff);color:#fff;font-size:16px;font-weight:800;cursor:pointer;box-shadow:0 8px 18px rgba(155,107,255,.35)}
button.main:disabled{opacity:.6;cursor:wait}
.msg{min-height:22px;font-size:14px;margin-top:10px;text-align:center}
.err{color:#c2185b;font-weight:700}
.ok{color:#2e7d32;font-weight:700}
.codigo{font-size:34px;letter-spacing:7px;font-weight:900;text-align:center;background:linear-gradient(135deg,#fff0f7,#f0e6ff);border:2px solid #f4b6d6;border-radius:18px;padding:16px 8px;margin:12px 0;color:#7a2a8a;user-select:all}
.barra{height:10px;border-radius:99px;background:#f0e6ff;overflow:hidden;margin-top:12px}
.barra div{height:100%;width:8%;background:linear-gradient(90deg,#ff8fc0,#9b6bff,#4fb3ff);border-radius:99px;transition:width .6s ease}
.estado{text-align:center;font-weight:700;margin-top:10px;font-size:15px}
.faq details{background:#faf5ff;border-radius:12px;padding:10px 12px;margin:8px 0;font-size:13px}
.faq summary{cursor:pointer;font-weight:700;color:#7a3fa0}
.pie{text-align:center;font-size:12px;color:#8a5fa0;margin-top:10px}
.oculto{display:none}
</style></head>
<body>
<div class="flor" style="left:6%">✿</div>
<div class="flor" style="left:30%;animation-delay:2s">♡</div>
<div class="flor" style="left:58%;animation-delay:4s">✦</div>
<div class="flor" style="left:82%;animation-delay:6s">❀</div>

<div class="wrap">
  <div class="logo">
    <div class="t">✿ AKAME-MD ✿</div>
    <div class="s">Vincula tu subbot en 3 pasos ♡</div>
  </div>

  <div class="card">
    <h2>🌐 Link público</h2>
    <span class="badge wait" id="badge-link">⏳ Preparando…</span>
    <div class="link">
      <code id="link-txt">Esperando el túnel…</code>
      <button class="pill" id="btn-copiar" onclick="copiarLink()" disabled>Copiar</button>
    </div>
    <div class="ayuda" style="margin-top:8px">Este link cambia cuando el servidor se reinicia. Si no abre, pide el link nuevo al dueño del bot.</div>
  </div>

  <div class="card">
    <h2>📱 Cómo vincular</h2>
    <ol class="pasos">
      <li>Escribe tu número de WhatsApp con código de país, sin + ni espacios.</li>
      <li>Toca <b>Generar código</b> y copia los 8 dígitos que aparecen.</li>
      <li>En WhatsApp: ⋮ → <b>Dispositivos vinculados</b> → <b>Vincular un dispositivo</b> → <b>Vincular con el número de teléfono</b>.</li>
      <li>Pega el código. Cuando se conecte, aquí verás ✅.</li>
    </ol>
  </div>

  <div class="card">
    <h2>✏️ Tu número</h2>
    <label for="num">Número de WhatsApp</label>
    <input id="num" type="tel" inputmode="numeric" placeholder="51999999999" autocomplete="off">
    <div class="ayuda">Ejemplo Perú: 51 + tu número. México: 521 + tu número.</div>
    <button class="main" id="btn" onclick="pedir()">Generar código ♡</button>
    <div class="msg" id="msg"></div>
  </div>

  <div class="card oculto" id="card-codigo">
    <h2>🔑 Tu código</h2>
    <div class="codigo" id="codigo"></div>
    <div class="ayuda" style="text-align:center">Toca el código para seleccionarlo y cópialo.</div>
    <div class="barra"><div id="progreso"></div></div>
    <div class="estado" id="estado">⏳ Esperando vinculación…</div>
  </div>

  <div class="card faq">
    <h2>❓ Preguntas frecuentes</h2>
    <details><summary>¿Por qué no abre el link?</summary>
      <p>El túnel puede tardar un poco o el servidor pudo reiniciarse. Espera un minuto y vuelve a cargar, o pide el link actualizado.</p></details>
    <details><summary>¿Cuánto dura el código?</summary>
      <p>Hasta que lo uses en WhatsApp. Si caduca, pide uno nuevo; puedes pedir 1 cada 5 minutos.</p></details>
    <details><summary>¿Para qué sirve el subbot?</summary>
      <p>Es una copia del bot en tu WhatsApp, con sus mismas funciones. Desde el chat escribes <b>.menu</b>.</p></details>
  </div>

  <div class="pie">AKAME-MD · hecho con ♡</div>
</div>

<script>
var timer = null;
var numero = '';
var intentos = 0;

function mostrar(texto, clase) {
  var m = document.getElementById('msg');
  m.textContent = texto;
  m.className = 'msg ' + (clase || '');
}

function cargarLink() {
  fetch('/api/link').then(function (r) { return r.json(); }).then(function (d) {
    var badge = document.getElementById('badge-link');
    var txt = document.getElementById('link-txt');
    var btn = document.getElementById('btn-copiar');
    if (d.url) {
      txt.textContent = location.origin;
      btn.disabled = false;
      badge.textContent = '✅ Activo';
      badge.className = 'badge';
    } else {
      txt.textContent = 'Preparando el túnel…';
      badge.textContent = '⏳ Preparando…';
      badge.className = 'badge wait';
      setTimeout(cargarLink, 4000);
    }
  }).catch(function () { setTimeout(cargarLink, 6000); });
}

function copiarLink() {
  var t = document.getElementById('link-txt').textContent;
  if (navigator.clipboard) navigator.clipboard.writeText(t);
  document.getElementById('btn-copiar').textContent = '¡Listo!';
  setTimeout(function () { document.getElementById('btn-copiar').textContent = 'Copiar'; }, 1500);
}

function pedir() {
  var btn = document.getElementById('btn');
  numero = document.getElementById('num').value.replace(/\\D/g, '');
  if (!numero) { mostrar('Escribe tu número primero.', 'err'); return; }
  btn.disabled = true;
  mostrar('Generando código…', '');
  fetch('/api/codigo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ numero: numero })
  }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
    .then(function (x) {
      btn.disabled = false;
      if (!x.ok) { mostrar(x.d.error || 'No se pudo generar el código.', 'err'); return; }
      document.getElementById('codigo').textContent = x.d.codigo;
      document.getElementById('card-codigo').classList.remove('oculto');
      mostrar('¡Código listo! Cópialo y escríbelo en WhatsApp ♡', 'ok');
      document.getElementById('card-codigo').scrollIntoView({ behavior: 'smooth' });
      vigilar();
    })
    .catch(function () { btn.disabled = false; mostrar('Error de conexión, intenta otra vez.', 'err'); });
}

function vigilar() {
  if (timer) clearInterval(timer);
  intentos = 0;
  timer = setInterval(function () {
    intentos++;
    var pct = Math.min(95, 8 + intentos * 3);
    document.getElementById('progreso').style.width = pct + '%';
    fetch('/api/estado?numero=' + numero).then(function (r) { return r.json(); }).then(function (d) {
      var txt = document.getElementById('estado');
      if (d.estado === 'conectado') {
        txt.textContent = '✅ ¡Subbot conectado! Ya puedes usarlo ♡';
        document.getElementById('progreso').style.width = '100%';
        clearInterval(timer);
      } else if (d.estado === 'emparejando' || d.estado === 'ninguno') {
        txt.textContent = '⏳ Esperando vinculación…';
      } else {
        txt.textContent = 'Estado: ' + d.estado;
      }
    }).catch(function () {});
    if (intentos > 100) clearInterval(timer);
  }, 3000);
}

cargarLink();
</script>
</body></html>`;

let linkPublico = '';

const json = (res: http.ServerResponse, code: number, obj: any) => {
    res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj));
};

const leerCuerpo = (req: http.IncomingMessage): Promise<string> => new Promise((resolve, reject) => {
    let datos = '';
    req.on('data', (c) => {
        datos += c;
        if (datos.length > 2000) { reject(new Error('demasiado')); req.destroy(); }
    });
    req.on('end', () => resolve(datos));
    req.on('error', reject);
});

const servidor = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url || '/', 'http://localhost');

        if (req.method === 'GET' && url.pathname === '/') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(PAGINA);
        }

        if (req.method === 'GET' && url.pathname === '/api/link') {
            return json(res, 200, { url: linkPublico || null });
        }

        if (req.method === 'GET' && url.pathname === '/api/estado') {
            const numero = (url.searchParams.get('numero') || '').replace(/\D/g, '');
            return json(res, 200, { estado: buscarSubbot(numero)?.estado || 'ninguno' });
        }

        if (req.method === 'POST' && url.pathname === '/api/codigo') {
            let body: any;
            try { body = JSON.parse(await leerCuerpo(req)); } catch { return json(res, 400, { error: 'Datos inválidos.' }); }

            const numero = String(body?.numero || '').replace(/\D/g, '');
            if (!/^\d{8,15}$/.test(numero)) {
                return json(res, 400, { error: 'Escribe tu número con código de país. Ejemplo: 51999999999' });
            }

            const existente = buscarSubbot(numero);
            if (existente?.estado === 'conectado') {
                return json(res, 409, { error: 'Ese número ya tiene un subbot conectado.' });
            }
            if (existente && existente.estado !== 'emparejando') {
                return json(res, 409, { error: 'Ese número ya tiene un subbot. Pide al dueño que lo reactive.' });
            }

            const ahora = Date.now();
            const falta = ESPERA_MS - (ahora - (ultimoPedido.get(numero) || 0));
            if (falta > 0) {
                return json(res, 429, { error: `Espera ${Math.ceil(falta / 1000)} s antes de pedir otro código.` });
            }
            ultimoPedido.set(numero, ahora);

            try {
                // Código que nunca se vinculó: se reemplaza por uno nuevo
                if (existente) borrarSubbot(existente.id);
                const { codigo } = await crearSubbot(numero);
                return json(res, 200, { codigo });
            } catch (e: any) {
                return json(res, 400, { error: e?.message || 'No se pudo crear el subbot.' });
            }
        }

        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('No encontrado');
    } catch (e: any) {
        console.log('[VINCULAR WEB ERROR]', e?.message);
        if (!res.headersSent) json(res, 500, { error: 'Error interno.' });
    }
});

/** Descarga cloudflared la primera vez (si no existe). */
const asegurarCloudflared = async (): Promise<boolean> => {
    if (fs.existsSync(BIN_CLOUDFLARED)) return true;
    try {
        fs.mkdirSync(CARPETA_BIN, { recursive: true });
        console.log('[VINCULAR WEB] descargando cloudflared…');
        const res = await axios.get(URL_DESCARGA, { responseType: 'arraybuffer', timeout: 180000, maxRedirects: 5 });
        fs.writeFileSync(BIN_CLOUDFLARED, Buffer.from(res.data));
        fs.chmodSync(BIN_CLOUDFLARED, 0o755);
        return true;
    } catch (e: any) {
        console.log('[VINCULAR WEB] no se pudo descargar cloudflared:', e?.message);
        return false;
    }
};

let tunel: ChildProcess | null = null;

/** Le dice a la página de Render el link de túnel actual del bot. */
const avisarRender = async () => {
    if (!REGISTRO_URL || !REGISTRO_SECRETO || !linkPublico) return;
    try {
        await axios.post(REGISTRO_URL, { url: linkPublico }, { headers: { 'x-secreto': REGISTRO_SECRETO }, timeout: 15000 });
    } catch (e: any) {
        console.log('[VINCULAR WEB] no se pudo avisar a Render:', e?.message);
    }
};
let reintentos = 0;

/** Abre el túnel público de Cloudflare (Quick Tunnel) y guarda el link. Se reintenta si se cae. */
const abrirTunel = () => {
    if (!fs.existsSync(BIN_CLOUDFLARED)) return;
    tunel = spawn(BIN_CLOUDFLARED, ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PUERTO}`]);

    const mirar = (datos: Buffer) => {
        const m = datos.toString().match(REGEX_LINK);
        if (m && linkPublico !== m[0]) {
            linkPublico = m[0];
            reintentos = 0;
            console.log(`[VINCULAR WEB] link público: ${linkPublico}`);
            avisarRender();
        }
    };
    tunel.stdout?.on('data', mirar);
    tunel.stderr?.on('data', mirar);

    tunel.on('exit', () => {
        linkPublico = '';
        tunel = null;
        reintentos++;
        const espera = Math.min(60, 5 * reintentos) * 1000;
        console.log(`[VINCULAR WEB] el túnel se cerró; reintento en ${espera / 1000} s`);
        setTimeout(abrirTunel, espera);
    });
};

// Se levanta una sola vez, aunque .fix vuelva a cargar este archivo
// Los subbots son procesos aparte (fork) con AKAME_SUBBOT_ID: solo el bot principal abre la página y el túnel
const g = globalThis as any;
if (!process.env.AKAME_SUBBOT_ID && !g.__vincularWebActivo) {
    g.__vincularWebActivo = true;
    servidor.on('error', (e: any) => {
        console.log('[VINCULAR WEB] no se pudo iniciar:', e?.message);
        g.__vincularWebActivo = false;
    });
    servidor.listen(PUERTO, '0.0.0.0', () => {
        console.log(`[VINCULAR WEB] activa en el puerto ${PUERTO}`);
        asegurarCloudflared().then((ok) => { if (ok) abrirTunel(); });
        // Renueva el aviso a Render cada 3 minutos (si Render se reinició, vuelve a tener el link)
        setInterval(avisarRender, 3 * 60 * 1000);
    });
}

export default {
    description: 'Página web para vincular subbots (no es comando)'
};
