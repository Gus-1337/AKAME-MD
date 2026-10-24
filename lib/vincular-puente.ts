import { crearSubbot, buscarSubbot, panelEnviarCodigo, panelGrupos, panelAplicar, panelPerfil } from './subbots.ts';

// Puente entre la página de vinculación (Render) y el bot principal.
// El bot pregunta a Render cada pocos segundos si hay pedidos nuevos, crea el subbot
// y devuelve el código. Como sale del bot hacia Render, no hace falta túnel ni link fijo.
// Variables (en .env): VINCULAR_RENDER_URL y VINCULAR_SECRETO (la misma clave que en Render).

const BASE = (process.env.VINCULAR_RENDER_URL || '').replace(/\/+$/, '');
const SECRETO = process.env.VINCULAR_SECRETO || '';
const CADA_MS = 3000;

// id del pedido -> número del subbot que se está vinculando
const seguimiento = new Map<string, string>();
// pedidos que se están atendiendo ahora (para no pedir el mismo dos veces)
const enProceso = new Set<string>();
let iniciado = false;
let avisoCaida = false;

const llamar = async (metodo: 'GET' | 'POST', ruta: string, cuerpo?: unknown): Promise<any> => {
    const r = await fetch(BASE + ruta, {
        method: metodo,
        headers: { 'x-secreto': SECRETO, 'Content-Type': 'application/json' },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
        signal: AbortSignal.timeout(20000)
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
};

const atender = async (id: string, numero: string, personal?: any) => {
    enProceso.add(id);
    try {
        const { codigo } = await crearSubbot(numero, undefined, personal);
        seguimiento.set(id, numero);
        await llamar('POST', '/api/bot/respuesta', { id, codigo });
        console.log(`[VINCULAR WEB] código enviado al pedido ${id}`);
    } catch (e: any) {
        await llamar('POST', '/api/bot/respuesta', { id, error: e?.message || 'No se pudo generar el código' }).catch(() => {});
    } finally {
        enProceso.delete(id);
    }
};

// Informa a la página cuando el subbot se conecta, se cae o el código caduró
const revisarSeguimiento = async () => {
    for (const [id, numero] of seguimiento) {
        const sub = buscarSubbot(numero);
        let estado: string | null = null;
        if (!sub) estado = 'expirado';
        else if (sub.estado === 'conectado') estado = 'conectado';
        else if (sub.estado === 'caido' || sub.estado === 'pausado') estado = 'caido';
        if (!estado) continue;
        await llamar('POST', '/api/bot/estado', { id, estado }).catch(() => {});
        seguimiento.delete(id); // ya se avisó el estado final
    }
};

// Pedidos del panel del dueño (código, grupos y cambios). Van al subbot de ese número.
const atenderPanel = async (p: any) => {
    enProceso.add(p.id);
    try {
        const sub = buscarSubbot(String(p.numero));
        if (!sub || sub.estado !== 'conectado') throw new Error('Tu subbot no está conectado. Enciéndelo y vuelve a intentar.');
        let datos: any = null;
        if (p.tipo === 'codigo') {
            await panelEnviarCodigo(sub.id, String(p.codigo || ''));
        } else if (p.tipo === 'grupos') {
            datos = { ...(await panelGrupos(sub.id)), estado: sub.estado };
        } else if (p.tipo === 'perfil') {
            await panelPerfil(sub.id, p.perfil || {});
        } else if (p.tipo === 'aplicar') {
            const r = await panelAplicar(sub.id, p.cambios || {});
            datos = { aplicados: r.aplicados ?? 0 };
        } else {
            throw new Error('Pedido desconocido');
        }
        await llamar('POST', '/api/bot/panel-respuesta', { id: p.id, datos });
    } catch (e: any) {
        await llamar('POST', '/api/bot/panel-respuesta', { id: p.id, error: e?.message || 'Error del subbot' }).catch(() => {});
    } finally {
        enProceso.delete(p.id);
    }
};

const ciclo = async () => {
    try {
        const { pedidos } = await llamar('GET', '/api/bot/pendientes');
        avisoCaida = false;
        for (const p of pedidos || []) {
            if (!enProceso.has(p.id)) void atender(p.id, p.numero, p.perfil);
        }
        await revisarSeguimiento();

        const { pedidos: delPanel } = await llamar('GET', '/api/bot/panel-pendientes');
        for (const p of delPanel || []) {
            if (!enProceso.has(p.id)) void atenderPanel(p);
        }
    } catch (e: any) {
        if (!avisoCaida) {
            console.log(`[VINCULAR WEB] no pude hablar con la página (${e?.message}). Reintento en silencio.`);
            avisoCaida = true;
        }
    } finally {
        setTimeout(ciclo, CADA_MS);
    }
};

/** Arranca el puente. Solo en el bot principal; los subbots no lo usan. */
export const iniciarVincularWeb = () => {
    if (iniciado) return;
    if (process.env.AKAME_SUBBOT_ID) return;
    if (!BASE || !SECRETO) {
        console.log('[VINCULAR WEB] apagado: falta VINCULAR_RENDER_URL o VINCULAR_SECRETO en .env');
        return;
    }
    iniciado = true;
    console.log(`[VINCULAR WEB] conectado a ${BASE}`);
    setTimeout(ciclo, 1000);
};
