import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import { descargarArchivo, LIMITE_BYTES, mb, type Info } from '../../lib/descarga.ts';

// Fuente principal: búsqueda y enlaces directos del APK (sin clave).
// Respaldo: la API de Delirius (una sola app por nombre). Ambas son de solo lectura.
const APTOIDE = 'https://ws75.aptoide.com/api/7';
const MIME_APK = 'application/vnd.android.package-archive';
const MAX_RESULTADOS = 10;
const UA = { 'User-Agent': 'Mozilla/5.0' };

const g = global as any;

type App = {
    id: number;
    nombre: string;
    paquete: string;
    dev: string;
    peso: number;
    version: string;
    icono: string;
    archivo?: string;
    archivoAlt?: string;
};

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

const limpiarNombre = (n: string) => String(n || 'app').replace(/[\\/:*?"<>|]/g, '').trim() || 'app';

const aApp = (it: any): App => ({
    id: Number(it.id),
    nombre: it.name || 'Sin nombre',
    paquete: it.package || '',
    dev: it.developer?.name || 'Desconocido',
    peso: Number(it.size) || Number(it.file?.filesize) || 0,
    version: it.file?.vername || '?',
    icono: it.icon || it.graphic || '',
    archivo: it.file?.path || undefined,
    archivoAlt: it.file?.path_alt || undefined
});

/**
 * Busca apps por nombre: pide páginas hasta juntar MAX_RESULTADOS apps distintas
 * que tengan APK descargable (sin repetir el mismo paquete).
 * Solo la primera página puede lanzar error; las siguientes, si fallan, se omiten.
 */
async function buscarApps(q: string): Promise<App[]> {
    const apps: App[] = [];
    const vistos = new Set<string>();
    for (let pagina = 0; pagina < 3 && apps.length < MAX_RESULTADOS; pagina++) {
        let data: any;
        try {
            ({ data } = await axios.get(`${APTOIDE}/apps/search`, {
                params: { query: q, limit: 20, offset: pagina * 20 }, timeout: 20000, headers: UA
            }));
        } catch (e) {
            if (pagina === 0) throw e;
            break;
        }
        const lista: any[] = data?.datalist?.list || [];
        for (const it of lista) {
            if (!it.file?.path) continue;
            const clave = it.package || String(it.id);
            if (vistos.has(clave)) continue;
            vistos.add(clave);
            apps.push(aApp(it));
            if (apps.length >= MAX_RESULTADOS) break;
        }
        if (!lista.length || !data?.datalist?.next) break;
    }
    return apps;
}

/** Datos de una app por su ID (incluye los enlaces del APK). */
async function appPorId(id: number): Promise<App | null> {
    const { data } = await axios.get(`${APTOIDE}/app/get`, {
        params: { app_id: id }, timeout: 20000, headers: UA
    });
    const it = data?.nodes?.meta?.data;
    return it ? aApp(it) : null;
}

/** Respaldo por nombre: Delirius devuelve la app más relevante. */
async function respaldoDelirius(q: string): Promise<{ app: App; link: string; paquete: string } | null> {
    const base = g.APIs?.delirius?.url || 'https://api.delirius.online';
    const { data } = await axios.get(`${base}/download/apk?query=${encodeURIComponent(q)}`, { timeout: 25000, headers: UA });
    const d = data?.data;
    if (!data?.status || !d?.download) return null;
    const app: App = {
        id: 0,
        nombre: d.name || q,
        paquete: d.id || '',
        dev: d.developer || 'Desconocido',
        peso: Number(d.sizeByte) || 0,
        version: '?',
        icono: d.image || '',
        archivo: d.download
    };
    return { app, link: d.download, paquete: d.id || '' };
}

/** Descarga el APK con los respaldos en orden: enlace principal, enlace alterno y luego Delirius. */
async function bajarApk(app: App, destino: string): Promise<void> {
    const fuentes: string[] = [app.archivo, app.archivoAlt].filter(Boolean) as string[];

    // Respaldo: Delirius con el nombre del paquete, solo si el paquete coincide
    if (app.paquete) {
        try {
            const r = await respaldoDelirius(app.paquete);
            if (r && r.paquete === app.paquete) fuentes.push(r.link);
        } catch { /* sin respaldo extra */ }
    }

    let ultimoError = 'sin respuesta';
    for (const link of fuentes) {
        const info: Info = { nombre: `${limpiarNombre(app.nombre)}.apk`, link, tamano: app.peso, mime: MIME_APK };
        try {
            await descargarArchivo(info, destino);
            return;
        } catch (e: any) {
            ultimoError = e?.message || ultimoError;
            if (String(e?.message).includes('más de')) throw e; // el límite no cambia con otro enlace
            fs.rmSync(destino, { force: true });
        }
    }
    throw new Error(ultimoError);
}

/** Borra el temporal y cualquier parte que haya quedado a medias. */
function limpiar(destino: string) {
    fs.rmSync(destino, { force: true });
    const dir = path.dirname(destino);
    const base = path.basename(destino);
    for (const f of fs.readdirSync(dir)) {
        if (f.startsWith(base + '.parte')) fs.rmSync(path.join(dir, f), { force: true });
    }
}

/** Manda la lista de resultados con selección única (single_select). */
async function enviarLista(sock: any, chat: string, quoted: any, usedPrefix: string, q: string, apps: App[]) {
    const rows = apps.map((a) => ({
        title: a.nombre.slice(0, 40),
        description: `${a.dev} • ${mb(a.peso)} • v${a.version}`.slice(0, 72),
        id: `${usedPrefix}apk id:${a.id}`
    }));

    const cuerpo = caja('APK SEARCH', [
        `✧ Búsqueda » *${q}*`,
        `✦ Resultados » *${apps.length}*`,
        '',
        'Elige la app que quieres descargar 🌸'
    ]).replace(/\n> AKAME-MD 🌸$/, '');

    let header: any = undefined;
    const icono = apps.find((a) => a.icono)?.icono;
    if (icono) {
        try {
            const media = await prepareWAMessageMedia({ image: { url: icono } }, { upload: sock.waUploadToServer });
            header = { hasMediaAttachment: true, imageMessage: media.imageMessage };
        } catch { header = undefined; }
    }

    const opciones: any = quoted?.message ? { quoted } : {};
    const list = generateWAMessageFromContent(chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    body: { text: cuerpo },
                    footer: { text: 'AKAME MD • Elige una app' },
                    ...(header ? { header } : {}),
                    nativeFlowMessage: {
                        buttons: [{
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: 'Elegir app',
                                sections: [{ title: '📱 APPS ENCONTRADAS', highlight_label: 'APK', rows }]
                            })
                        }]
                    }
                }
            }
        }
    }, opciones);

    await sock.relayMessage(chat, list.message, { messageId: list.key.id });
}

/** Descarga la app elegida y la manda como documento. */
async function enviarApp(sock: any, m: any, chat: string, app: App) {
    if (app.peso && app.peso > LIMITE_BYTES) {
        await sock.sendMessage(chat, {
            text: caja('APK', [`✧ *${app.nombre}* pesa ${mb(app.peso)}.`, '✦ El límite es de 800 MB.'])
        }, { quoted: m });
        return;
    }

    const destino = path.join(os.tmpdir(), `apk-${randomBytes(6).toString('hex')}`);
    try {
        await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });

        if (app.icono) {
            try {
                await sock.sendMessage(chat, {
                    image: { url: app.icono },
                    caption: caja('APK LISTA', [
                        `✧ *Nombre:* ${app.nombre}`,
                        `✧ *Paquete:* ${app.paquete || '—'}`,
                        `✧ *Desarrollador:* ${app.dev}`,
                        `✧ *Versión:* ${app.version}`,
                        `✧ *Peso:* ${app.peso ? mb(app.peso) : '?'}`,
                        '',
                        'Enviando el archivo, espera un momento 🌸'
                    ]).replace(/\n> AKAME-MD 🌸$/, '')
                }, { quoted: m });
            } catch { /* si falla la imagen, se sigue con el archivo */ }
        }

        await bajarApk(app, destino);
        const tamano = fs.statSync(destino).size;

        await sock.sendMessage(chat, {
            document: { stream: fs.createReadStream(destino) },
            mimetype: MIME_APK,
            fileName: `${limpiarNombre(app.nombre)}.apk`,
            caption: caja('APK', [`✧ *${app.nombre}*`, `✦ Peso » *${mb(tamano)}*`])
        }, { quoted: m });
        await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
    } catch (e: any) {
        console.error('[APK ERROR]', e?.message);
        const limite = String(e?.message).includes('más de');
        await sock.sendMessage(chat, {
            text: limite
                ? caja('APK', ['✧ Esa app pesa más de 800 MB, no la puedo enviar.'])
                : caja('APK', ['✧ No pude descargar esa app.', '✦ Prueba otra vez o elige otra.'])
        }, { quoted: m });
        await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
    } finally {
        limpiar(destino);
    }
}

export default {
    command: ['apk', 'apkdl', 'modapk'],
    description: 'Busca APKs y elige cuál descargar (hasta 800 MB)',
    category: 'download',

    run: async (ctx: any): Promise<void> => {
        const { sock, chat, args, usedPrefix } = ctx;
        const m = ctx.m ?? ctx.msg;

        if (!args?.[0]) {
            await sock.sendMessage(chat, {
                text: caja('APK', [
                    `✧ Usa *${usedPrefix}apk <nombre de la app>*`,
                    `✦ Ejemplo: *${usedPrefix}apk whatsapp*`
                ])
            }, { quoted: m });
            return;
        }

        // Selección desde la lista: ".apk id:<número>"
        const sel = String(args[0]).match(/^id:(\d+)$/i);
        if (sel) {
            try {
                const app = await appPorId(Number(sel[1]));
                if (!app) throw new Error('no encontré esa app');
                await enviarApp(sock, m, chat, app);
            } catch (e: any) {
                await sock.sendMessage(chat, { text: caja('APK', ['✧ No encontré esa app.', '✦ Vuelve a buscarla con el nombre.']) }, { quoted: m });
            }
            return;
        }

        const q = args.join(' ').trim();
        await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });

        let apps: App[] = [];
        let fallo = false;
        try {
            apps = await buscarApps(q);
        } catch (e: any) {
            fallo = true;
            console.error('[APK BUSQUEDA]', e?.message);
        }

        // Respaldo: solo si la búsqueda falló (Delirius siempre devuelve algo, aunque no coincida)
        if (fallo) {
            try {
                const r = await respaldoDelirius(q);
                if (r) {
                    await enviarApp(sock, m, chat, r.app);
                    return;
                }
            } catch (e: any) {
                console.error('[APK RESPALDO]', e?.message);
            }
            await sock.sendMessage(chat, { text: caja('APK', [`✧ No encontré *${q}*.`, '✦ Prueba con otro nombre.']) }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
            return;
        }

        if (!apps.length) {
            await sock.sendMessage(chat, { text: caja('APK', [`✧ No encontré *${q}*.`, '✦ Prueba con otro nombre.']) }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
            return;
        }

        await enviarLista(sock, chat, m, usedPrefix, q, apps);
        await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
    }
};
