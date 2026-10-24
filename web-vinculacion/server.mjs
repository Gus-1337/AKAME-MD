// Página de vinculación de subbots (Render).
// No habla directo con el bot: el bot (en HiddenCloud) le pregunta cada pocos segundos
// si hay pedidos nuevos, y le manda el código. Como el bot hace esas consultas,
// Render no se duerme y no hace falta túnel ni link que cambie.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { rutaPanel } from './panel.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = Number(process.env.PORT || 10000);
const SECRETO = process.env.VINCULAR_SECRETO || '';
const ESPERA_NUMERO_MS = 60 * 1000;   // 1 pedido por número cada 60 s
const VIDA_PEDIDO_MS = 15 * 60 * 1000; // los pedidos viejos se borran
const MAX_PEDIDOS = 500;

const pedidos = new Map(); // id -> { numero, estado, codigo, error, creado, actualizado }
const ultimoPorNumero = new Map();
const HTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const FONDO = fs.readFileSync(path.join(__dirname, 'fondo.jpg'));

const json = (res, status, obj) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(obj));
};

const leerCuerpo = (req) => new Promise((ok, no) => {
    const partes = [];
    let total = 0;
    req.on('data', (d) => {
        total += d.length;
        if (total > 500_000) { no(new Error('demasiado grande')); req.destroy(); return; }
        partes.push(d);
    });
    req.on('end', () => {
        try { ok(JSON.parse(Buffer.concat(partes).toString() || '{}')); } catch { no(new Error('json inválido')); }
    });
    req.on('error', no);
});

const esSecretoValido = (req) => {
    if (!SECRETO) return false;
    const recibido = Buffer.from(String(req.headers['x-secreto'] || ''));
    const esperado = Buffer.from(SECRETO);
    return recibido.length === esperado.length && crypto.timingSafeEqual(recibido, esperado);
};

// Limpia pedidos viejos para que la memoria no crezca
setInterval(() => {
    const limite = Date.now() - VIDA_PEDIDO_MS;
    for (const [id, p] of pedidos) if (p.creado < limite) pedidos.delete(id);
    for (const [n, t] of ultimoPorNumero) if (t < limite) ultimoPorNumero.delete(n);
}, 60 * 1000).unref();

const servidor = http.createServer(async (req, res) => {
    try {
        const url = new URL(req.url || '/', 'http://localhost');
        const ruta = url.pathname;

        // ---- Página ----
        if (req.method === 'GET' && (ruta === '/' || ruta === '/index.html')) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            return res.end(HTML);
        }
        if (req.method === 'GET' && ruta === '/health') return json(res, 200, { ok: true });
        // Panel del dueño del subbot (código, grupos y antis)
        if (await rutaPanel(req, res, url, { json, leerCuerpo, esSecretoValido })) return;

        if (req.method === 'GET' && ruta === '/fondo.jpg') {
            res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=86400' });
            return res.end(FONDO);
        }

        // ---- Lo usa la página ----
        if (req.method === 'POST' && ruta === '/api/vincular') {
            let datos;
            try { datos = await leerCuerpo(req); } catch { return json(res, 400, { error: 'Datos inválidos.' }); }
            const numero = String(datos?.numero || '').replace(/\D/g, '');
            if (numero.length < 8 || numero.length > 15) {
                return json(res, 400, { error: 'Escribe tu número con código de país, ej. 51999999999.' });
            }
            const ahora = Date.now();
            const ultimo = ultimoPorNumero.get(numero) || 0;
            if (ahora - ultimo < ESPERA_NUMERO_MS) {
                const seg = Math.ceil((ESPERA_NUMERO_MS - (ahora - ultimo)) / 1000);
                return json(res, 429, { error: `Espera ${seg} s antes de pedir otro código.` });
            }
            if (pedidos.size >= MAX_PEDIDOS) return json(res, 503, { error: 'Hay muchos pedidos. Intenta en un minuto.' });

            // Personalización opcional (se valida otra vez en el bot)
            const nombre = String(datos?.nombre || '').trim();
            if (nombre.length > 30) return json(res, 400, { error: 'El nombre puede tener hasta 30 caracteres.' });
            const prefijo = String(datos?.prefijo || '').trim();
            if (prefijo && !/^[^\p{L}\p{N}\s]{1,2}$/u.test(prefijo)) {
                return json(res, 400, { error: 'El prefijo debe ser de 1 o 2 símbolos, sin letras ni números. Ej: !' });
            }
            const banner = String(datos?.banner || '').trim();
            if (banner) {
                let enlace;
                try { enlace = new URL(banner); } catch { enlace = null; }
                if (!enlace || !['http:', 'https:'].includes(enlace.protocol) || banner.length > 500) {
                    return json(res, 400, { error: 'El banner debe ser un enlace que empiece con http o https.' });
                }
            }

            const id = crypto.randomUUID();
            const perfil = { nombre, prefijo, banner };
            const metodo = datos?.metodo === 'qr' ? 'qr' : 'codigo';
            pedidos.set(id, { numero, perfil, metodo, estado: 'pendiente', codigo: '', qr: '', error: '', creado: ahora, actualizado: ahora });
            ultimoPorNumero.set(numero, ahora);
            return json(res, 200, { id });
        }

        if (req.method === 'GET' && ruta.startsWith('/api/estado/')) {
            const p = pedidos.get(ruta.slice('/api/estado/'.length));
            if (!p) return json(res, 404, { error: 'Pedido no encontrado. Pide el código de nuevo.' });
            return json(res, 200, { estado: p.estado, codigo: p.codigo, qr: p.qr || '', error: p.error });
        }

        // ---- Lo usa el bot (con clave) ----
        if (ruta.startsWith('/api/bot/')) {
            if (!esSecretoValido(req)) return json(res, 401, { error: 'no autorizado' });

            if (req.method === 'GET' && ruta === '/api/bot/pendientes') {
                const lista = [];
                for (const [id, p] of pedidos) {
                    lista.push({ id, numero: p.numero, perfil: p.perfil, metodo: p.metodo || 'codigo' });
                }
                return json(res, 200, { pedidos: lista });
            }

            if (req.method === 'POST' && ruta === '/api/bot/respuesta') {
                const datos = await leerCuerpo(req).catch(() => null);
                const p = datos && pedidos.get(String(datos.id));
                if (!p) return json(res, 404, { error: 'pedido no existe' });
                if (datos.codigo) {
                    Object.assign(p, { estado: 'codigo', codigo: String(datos.codigo).slice(0, 20), actualizado: Date.now() });
                } else {
                    Object.assign(p, { estado: 'error', error: String(datos.error || 'No se pudo generar el código').slice(0, 300), actualizado: Date.now() });
                }
                return json(res, 200, { ok: true });
            }

            if (req.method === 'POST' && ruta === '/api/bot/qr') {
                const datos = await leerCuerpo(req).catch(() => null);
                const p = datos && pedidos.get(String(datos.id));
                if (!p) return json(res, 404, { error: 'pedido no existe' });
                const imagen = String(datos.qr || '');
                if (!imagen.startsWith('data:image/') || imagen.length > 400_000) {
                    return json(res, 400, { error: 'QR inválido' });
                }
                if (p.estado === 'pendiente' || p.estado === 'qr') {
                    Object.assign(p, { estado: 'qr', qr: imagen, actualizado: Date.now() });
                }
                return json(res, 200, { ok: true });
            }

            if (req.method === 'POST' && ruta === '/api/bot/estado') {
                const datos = await leerCuerpo(req).catch(() => null);
                const p = datos && pedidos.get(String(datos.id));
                if (!p) return json(res, 404, { error: 'pedido no existe' });
                if (datos.estado === 'conectado' || datos.estado === 'caido') {
                    Object.assign(p, { estado: datos.estado, actualizado: Date.now() });
                } else if (datos.estado === 'expirado') {
                    Object.assign(p, { estado: 'error', error: 'El código caducó. Pide uno nuevo.', actualizado: Date.now() });
                }
                return json(res, 200, { ok: true });
            }
        }

        return json(res, 404, { error: 'no encontrado' });
    } catch (e) {
        console.log('[VINCULAR] error:', e?.message);
        if (!res.headersSent) json(res, 500, { error: 'Error interno. Intenta de nuevo.' });
    }
});

servidor.listen(PUERTO, '0.0.0.0', () => console.log(`[VINCULAR] página en el puerto ${PUERTO}`));
