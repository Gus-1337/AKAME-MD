// Panel del dueño del subbot (Render).
// Flujo:
//   1) La persona pone su número y pide un código -> el bot lo manda por WhatsApp a ese número.
//   2) Escribe el código -> recibe un token de sesión (2 horas).
//   3) Con el token ve sus grupos y guarda los cambios (responde, antilink, antitoxic, antispam).
// El bot (en HiddenCloud) recoge los pedidos con /api/bot/panel-pendientes y responde con
// /api/bot/panel-respuesta, usando la misma clave VINCULAR_SECRETO.
import crypto from 'node:crypto';

const ESPERA_CODIGO_MS = 60 * 1000;     // 1 código por número cada 60 s
const VIDA_CODIGO_MS = 5 * 60 * 1000;   // el código vence en 5 min
const VIDA_SESION_MS = 2 * 60 * 60 * 1000;
const MAX_INTENTOS = 5;                 // intentos fallidos antes de bloquear
const BLOQUEO_MS = 10 * 60 * 1000;
const ESPERA_BOT_MS = 25 * 1000;

const codigos = new Map();   // numero -> { codigo, expira, intentos, bloqueadoHasta, ultimo }
const sesiones = new Map();  // token -> { numero, expira }
const trabajos = new Map();  // id -> { id, tipo, numero, codigo?, cambios?, enviado, resolver }

const aleatorio = (n) => crypto.randomBytes(n).toString('hex');

const iguales = (a, b) => {
    const x = Buffer.from(String(a));
    const y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Limpieza periódica
setInterval(() => {
    const ahora = Date.now();
    for (const [t, s] of sesiones) if (s.expira < ahora) sesiones.delete(t);
    for (const [n, c] of codigos) if (c.expira < ahora && (!c.bloqueadoHasta || c.bloqueadoHasta < ahora)) codigos.delete(n);
    for (const [id, t] of trabajos) if (t.creado < ahora - ESPERA_BOT_MS * 4) trabajos.delete(id);
}, 60 * 1000).unref();

/** Crea un pedido para el bot y espera su respuesta. */
const pedirAlBot = (tipo, datos) => new Promise((resolver) => {
    const id = aleatorio(12);
    const trabajo = { id, tipo, ...datos, enviado: false, creado: Date.now(), resolver: null };
    const fin = (resultado) => {
        clearTimeout(tiempo);
        trabajos.delete(id);
        resolver(resultado);
    };
    const tiempo = setTimeout(() => fin({ ok: false, error: 'Tu subbot no respondió a tiempo. Intenta de nuevo.' }), ESPERA_BOT_MS);
    trabajo.resolver = fin;
    trabajos.set(id, trabajo);
});

const sesionDe = (req) => {
    const cabecera = String(req.headers['authorization'] || '');
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : '';
    if (!token) return null;
    const s = sesiones.get(token);
    if (!s || s.expira < Date.now()) { sesiones.delete(token); return null; }
    return s;
};

/**
 * Atiende las rutas del panel. Devuelve true si la ruta era del panel.
 * deps: { json, leerCuerpo, esSecretoValido }
 */
export const rutaPanel = async (req, res, url, deps) => {
    const { json, leerCuerpo, esSecretoValido } = deps;
    const ruta = url.pathname;
    if (!ruta.startsWith('/api/panel/') && !ruta.startsWith('/api/bot/panel-')) return false;

    // ---- Lo usa el bot (con clave) ----
    if (ruta === '/api/bot/panel-pendientes' && req.method === 'GET') {
        if (!esSecretoValido(req)) { json(res, 401, { error: 'no autorizado' }); return true; }
        const lista = [];
        for (const t of trabajos.values()) {
            if (t.enviado) continue;
            t.enviado = true;
            const item = { id: t.id, tipo: t.tipo, numero: t.numero };
            if (t.tipo === 'codigo') item.codigo = t.codigo;
            if (t.tipo === 'aplicar') item.cambios = t.cambios;
            if (t.tipo === 'perfil') item.perfil = t.perfil;
            lista.push(item);
        }
        json(res, 200, { pedidos: lista });
        return true;
    }

    if (ruta === '/api/bot/panel-respuesta' && req.method === 'POST') {
        if (!esSecretoValido(req)) { json(res, 401, { error: 'no autorizado' }); return true; }
        let datos;
        try { datos = await leerCuerpo(req); } catch { json(res, 400, { error: 'datos inválidos' }); return true; }
        const t = trabajos.get(String(datos?.id || ''));
        if (!t) { json(res, 404, { error: 'pedido no existe o ya venció' }); return true; }
        t.resolver(datos.error
            ? { ok: false, error: String(datos.error).slice(0, 300) }
            : { ok: true, datos: datos.datos ?? null });
        json(res, 200, { ok: true });
        return true;
    }

    // ---- Lo usa la página ----
    if (ruta === '/api/panel/pedir-codigo' && req.method === 'POST') {
        let datos;
        try { datos = await leerCuerpo(req); } catch { json(res, 400, { error: 'Datos inválidos.' }); return true; }
        const numero = String(datos?.numero || '').replace(/\D/g, '');
        if (numero.length < 8 || numero.length > 15) { json(res, 400, { error: 'Escribe tu número con código de país.' }); return true; }

        const ahora = Date.now();
        const previo = codigos.get(numero) || {};
        if (previo.bloqueadoHasta && previo.bloqueadoHasta > ahora) {
            json(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' }); return true;
        }
        if (previo.ultimo && ahora - previo.ultimo < ESPERA_CODIGO_MS) {
            const seg = Math.ceil((ESPERA_CODIGO_MS - (ahora - previo.ultimo)) / 1000);
            json(res, 429, { error: `Espera ${seg} s antes de pedir otro código.` }); return true;
        }

        const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        codigos.set(numero, { codigo, expira: ahora + VIDA_CODIGO_MS, intentos: 0, bloqueadoHasta: 0, ultimo: ahora });

        const r = await pedirAlBot('codigo', { numero, codigo });
        if (!r.ok) {
            codigos.delete(numero);
            json(res, 400, { error: r.error }); return true;
        }
        json(res, 200, { ok: true });
        return true;
    }

    if (ruta === '/api/panel/entrar' && req.method === 'POST') {
        let datos;
        try { datos = await leerCuerpo(req); } catch { json(res, 400, { error: 'Datos inválidos.' }); return true; }
        const numero = String(datos?.numero || '').replace(/\D/g, '');
        const codigo = String(datos?.codigo || '').replace(/\D/g, '');
        const c = codigos.get(numero);
        const ahora = Date.now();

        if (!c || c.expira < ahora) { json(res, 401, { error: 'El código venció o no existe. Pide uno nuevo.' }); return true; }
        if (c.bloqueadoHasta && c.bloqueadoHasta > ahora) { json(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' }); return true; }

        if (!iguales(codigo, c.codigo)) {
            c.intentos += 1;
            if (c.intentos >= MAX_INTENTOS) {
                c.bloqueadoHasta = ahora + BLOQUEO_MS;
                c.intentos = 0;
                json(res, 429, { error: 'Demasiados intentos. Espera unos minutos.' }); return true;
            }
            json(res, 401, { error: 'Código incorrecto.' }); return true;
        }

        codigos.delete(numero);
        const token = aleatorio(32);
        sesiones.set(token, { numero, expira: ahora + VIDA_SESION_MS });
        json(res, 200, { token, expira: ahora + VIDA_SESION_MS });
        return true;
    }

    if (ruta === '/api/panel/grupos' && req.method === 'GET') {
        const s = sesionDe(req);
        if (!s) { json(res, 401, { error: 'Sesión vencida. Vuelve a entrar.' }); return true; }
        const r = await pedirAlBot('grupos', { numero: s.numero });
        if (!r.ok) { json(res, 400, { error: r.error }); return true; }
        json(res, 200, { grupos: r.datos?.grupos || [], perfil: r.datos?.perfil || null, estado: r.datos?.estado || null });
        return true;
    }

    if (ruta === '/api/panel/perfil' && req.method === 'POST') {
        const s = sesionDe(req);
        if (!s) { json(res, 401, { error: 'Sesión vencida. Vuelve a entrar.' }); return true; }
        let datos;
        try { datos = await leerCuerpo(req); } catch { json(res, 400, { error: 'Datos inválidos.' }); return true; }
        const perfil = {};
        if (datos?.nombre !== undefined) {
            const nombre = String(datos.nombre).trim();
            if (!nombre || nombre.length > 30) { json(res, 400, { error: 'El nombre tiene de 1 a 30 caracteres.' }); return true; }
            perfil.nombre = nombre;
        }
        if (datos?.prefijo !== undefined) {
            const prefijo = String(datos.prefijo).trim();
            if (!/^[^\p{L}\p{N}\s]{1,2}$/u.test(prefijo)) {
                json(res, 400, { error: 'El prefijo debe ser de 1 o 2 símbolos, sin letras ni números.' }); return true;
            }
            perfil.prefijo = prefijo;
        }
        if (datos?.banner !== undefined) {
            const banner = String(datos.banner).trim();
            if (banner.length > 500 || (banner && !/^https?:\/\//i.test(banner))) {
                json(res, 400, { error: 'El banner debe ser un enlace que empiece con http o https.' }); return true;
            }
            perfil.banner = banner;
        }
        const r = await pedirAlBot('perfil', { numero: s.numero, perfil });
        if (!r.ok) { json(res, 400, { error: r.error }); return true; }
        json(res, 200, { ok: true });
        return true;
    }

    if (ruta === '/api/panel/aplicar' && req.method === 'POST') {
        const s = sesionDe(req);
        if (!s) { json(res, 401, { error: 'Sesión vencida. Vuelve a entrar.' }); return true; }
        let datos;
        try { datos = await leerCuerpo(req); } catch { json(res, 400, { error: 'Datos inválidos.' }); return true; }
        const cambios = datos?.cambios && typeof datos.cambios === 'object' ? datos.cambios : {};
        const r = await pedirAlBot('aplicar', { numero: s.numero, cambios });
        if (!r.ok) { json(res, 400, { error: r.error }); return true; }
        json(res, 200, { ok: true, aplicados: r.datos?.aplicados ?? 0 });
        return true;
    }

    json(res, 404, { error: 'no encontrado' });
    return true;
};
