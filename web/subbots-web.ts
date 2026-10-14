// Web mínima para vincular subbots (etapa 2).
// Uso: node --experimental-strip-types web/subbots-web.ts
// Puerto: variable PORT (por defecto 3000).
import express from 'express';
import { crearSubbot, listarSubbots, MAX_SUBBOTS } from '../lib/subbots.ts';

const PORT = Number(process.env.PORT) || 3000;
const app = express();
app.use(express.json());

/** Oculta el número: solo se ven los últimos 3 dígitos. */
const enmascarar = (n: string) => `•••••••${String(n).slice(-3)}`;

const publico = (s: any) => ({ id: s.id, numero: enmascarar(s.numero), estado: s.estado, creado: s.creado });

app.get('/api/subbots', (_req, res) => {
    const lista = listarSubbots();
    res.json({
        max: MAX_SUBBOTS,
        usados: lista.filter((s) => s.estado !== 'expirado').length,
        lista: lista.map(publico)
    });
});

app.get('/api/subbots/:id', (req, res) => {
    const s = listarSubbots().find((x) => x.id === req.params.id);
    if (!s) return res.status(404).json({ estado: 'expirado', error: 'No existe o ya expiró' });
    res.json(publico(s));
});

app.post('/api/subbots', async (req, res) => {
    try {
        const { id, codigo } = await crearSubbot(String(req.body?.numero || ''));
        res.json({ id, codigo });
    } catch (e: any) {
        res.status(400).json({ error: e?.message || 'No se pudo crear el subbot' });
    }
});

app.get('/', (_req, res) => {
    res.type('html').send(PAGINA);
});

const PAGINA = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AKAME-MD · Subbots</title>
<style>
  body { font-family: system-ui, sans-serif; background: #fff6fb; color: #3b2a3f; margin: 0; padding: 24px; }
  .card { max-width: 520px; margin: 0 auto 20px; background: #fff; border-radius: 16px; padding: 22px; box-shadow: 0 4px 16px rgba(180,80,140,.12); }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .sub { color: #8a6f8f; font-size: 14px; margin-bottom: 16px; }
  input { width: 100%; padding: 12px; border: 1px solid #f0c8e0; border-radius: 10px; font-size: 16px; box-sizing: border-box; }
  button { margin-top: 10px; width: 100%; padding: 12px; border: 0; border-radius: 10px; background: #ff7eb6; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer; }
  button:disabled { background: #f3b6d3; cursor: default; }
  .codigo { font-size: 32px; font-weight: 700; letter-spacing: 3px; text-align: center; background: #fff0f7; border-radius: 12px; padding: 14px; margin: 14px 0 6px; }
  .pasos { font-size: 14px; line-height: 1.5; }
  .estado { font-size: 15px; margin-top: 10px; text-align: center; }
  .error { color: #c2185b; font-size: 14px; margin-top: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td, th { padding: 6px 4px; border-bottom: 1px solid #fbe3ef; text-align: left; }
</style>
</head>
<body>
<div class="card">
  <h1>🌸 Vincula tu subbot</h1>
  <div class="sub">Pon tu número con código de país, sin + ni espacios. Ej: 51999999999</div>
  <input id="numero" inputmode="numeric" placeholder="51999999999" autocomplete="off">
  <button id="crear">Generar código</button>
  <div id="resultado"></div>
</div>

<div class="card">
  <h1>Subbots</h1>
  <div class="sub" id="cupo">Cargando...</div>
  <table><thead><tr><th>Número</th><th>Estado</th><th>Creado</th></tr></thead><tbody id="lista"></tbody></table>
</div>

<script>
const $ = (id) => document.getElementById(id);
const etiqueta = { emparejando: '⏳ Esperando vinculación', conectado: '✅ Conectado', caido: '⚠️ Caído', expirado: '⌛ Expirado' };
let sondeo = null;

async function cargarLista() {
  const r = await fetch('/api/subbots');
  const d = await r.json();
  $('cupo').textContent = 'Cupos usados: ' + d.usados + ' de ' + d.max;
  $('lista').innerHTML = d.lista.map(s =>
    '<tr><td>' + s.numero + '</td><td>' + (etiqueta[s.estado] || s.estado) + '</td><td>' + new Date(s.creado).toLocaleString('es-PE') + '</td></tr>'
  ).join('') || '<tr><td colspan="3">Todavía no hay subbots</td></tr>';
}

function seguir(id) {
  clearInterval(sondeo);
  sondeo = setInterval(async () => {
    const r = await fetch('/api/subbots/' + id);
    const d = await r.json();
    $('estado').textContent = etiqueta[d.estado] || d.estado;
    if (d.estado === 'conectado' || d.estado === 'expirado' || d.estado === 'caido') {
      clearInterval(sondeo);
      cargarLista();
    }
  }, 3000);
}

$('crear').onclick = async () => {
  const btn = $('crear');
  btn.disabled = true;
  $('resultado').innerHTML = '<div class="estado">Generando código...</div>';
  try {
    const r = await fetch('/api/subbots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: $('numero').value.trim() })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Error');
    $('resultado').innerHTML =
      '<div class="codigo">' + d.codigo + '</div>' +
      '<div class="pasos">1. Abre WhatsApp en tu teléfono.<br>2. Ve a <b>Dispositivos vinculados</b> → <b>Vincular con número de teléfono</b>.<br>3. Escribe el código de arriba.<br>Tienes 90 segundos.</div>' +
      '<div class="estado" id="estado">⏳ Esperando vinculación</div>';
    seguir(d.id);
    cargarLista();
  } catch (e) {
    $('resultado').innerHTML = '<div class="error">' + e.message + '</div>';
  } finally {
    btn.disabled = false;
  }
};

cargarLista();
setInterval(cargarLista, 10000);
</script>
</body>
</html>`;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SUBBOTS WEB] http://0.0.0.0:${PORT}`);
});
