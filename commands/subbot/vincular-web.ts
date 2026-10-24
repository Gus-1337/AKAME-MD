import http from 'http';
import { crearSubbot, buscarSubbot, borrarSubbot } from '../../lib/subbots.ts';

// Página web para vincular un subbot con el código de 8 dígitos (sin entrar al chat).
// No es un comando: solo levanta el servidor una vez al arrancar el bot.
const PUERTO = Number(process.env.SERVER_PORT || process.env.PORT || 24588);
const ESPERA_MS = 5 * 60 * 1000; // 1 código cada 5 minutos por número
const ultimoPedido = new Map<string, number>();

const PAGINA = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AKAME-MD · Vincular subbot</title>
<style>
body{margin:0;min-height:100vh;font-family:system-ui,sans-serif;background:linear-gradient(160deg,#ffd6e8,#d6e8ff 60%,#e8d6ff);display:flex;align-items:center;justify-content:center;padding:16px;color:#4a2a5a}
.card{background:#fff;border-radius:24px;box-shadow:0 10px 30px rgba(120,60,140,.2);padding:24px;max-width:420px;width:100%;text-align:center;box-sizing:border-box}
h1{font-size:22px;margin:6px 0}
p{font-size:14px;line-height:1.5}
input{width:100%;box-sizing:border-box;padding:12px;border:2px solid #f4b6d6;border-radius:14px;font-size:16px;margin:12px 0;outline:none}
button{width:100%;padding:12px;border:0;border-radius:14px;background:#ff8fc0;color:#fff;font-size:16px;font-weight:bold;cursor:pointer}
button:disabled{opacity:.6}
.codigo{font-size:30px;letter-spacing:6px;font-weight:bold;background:#fff0f7;border-radius:14px;padding:14px;margin:14px 0;user-select:all}
.msg{min-height:20px;font-size:14px;margin-top:10px}
.err{color:#c2185b}
.ok{color:#2e7d32}
ol{text-align:left;font-size:14px;line-height:1.6}
</style></head>
<body>
<div class="card">
  <div>✿ ⋆ ♡ ⋆ ✿</div>
  <h1>AKAME-MD · Subbot</h1>
  <p>Escribe tu número de WhatsApp con código de país, sin + ni espacios.<br>Ejemplo: 51999999999</p>
  <input id="num" type="tel" inputmode="numeric" placeholder="51999999999">
  <button id="btn" onclick="pedir()">Generar código ♡</button>
  <div class="msg" id="msg"></div>
  <div id="res" hidden>
    <p>Tu código de vinculación:</p>
    <div class="codigo" id="codigo"></div>
    <ol>
      <li>Abre WhatsApp → los tres puntos → Dispositivos vinculados</li>
      <li>Toca Vincular un dispositivo → Vincular con el número de teléfono</li>
      <li>Escribe el código de arriba</li>
    </ol>
    <p id="estado">⏳ Esperando vinculación…</p>
  </div>
</div>
<script>
var timer = null;
var numero = '';
function mostrar(texto, clase) {
  var m = document.getElementById('msg');
  m.textContent = texto;
  m.className = 'msg ' + (clase || '');
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
      document.getElementById('res').hidden = false;
      mostrar('Código listo. Cópialo y escríbelo en WhatsApp.', 'ok');
      vigilar();
    })
    .catch(function () { btn.disabled = false; mostrar('Error de conexión, intenta otra vez.', 'err'); });
}
function vigilar() {
  if (timer) clearInterval(timer);
  var intentos = 0;
  timer = setInterval(function () {
    intentos++;
    fetch('/api/estado?numero=' + numero).then(function (r) { return r.json(); }).then(function (d) {
      var txt = document.getElementById('estado');
      if (d.estado === 'conectado') {
        txt.textContent = '✅ ¡Subbot conectado!';
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
</script>
</body></html>`;

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

// Se levanta una sola vez, aunque .fix vuelva a cargar este archivo
const g = globalThis as any;
if (!g.__vincularWebActivo) {
    g.__vincularWebActivo = true;
    servidor.on('error', (e: any) => {
        console.log('[VINCULAR WEB] no se pudo iniciar:', e?.message);
        g.__vincularWebActivo = false;
    });
    servidor.listen(PUERTO, '0.0.0.0', () => {
        console.log(`[VINCULAR WEB] activa en el puerto ${PUERTO}`);
    });
}

export default {
    description: 'Página web para vincular subbots (no es comando)'
};
