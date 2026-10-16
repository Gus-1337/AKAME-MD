import axios from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import { descargarArchivo, LIMITE_BYTES, type Info } from '../../lib/descarga.ts';

// Apps modificadas (dinero infinito, desbloqueadas) desde el sitio de APKs mod.
// Las páginas se leen en HTML; si el sitio cambia de diseño, hay que ajustar los patrones de abajo.
const SITIO = 'https://apkmody.mobi';
const MIME_APK = 'application/vnd.android.package-archive';
const MAX_RESULTADOS = 10;
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };
const AVISO = '⚠ App modificada de terceros. Instálala bajo tu responsabilidad.';

type Mod = { slug: string; nombre: string; version: string; icono: string };

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

const limpiarNombre = (n: string) => String(n || 'app').replace(/[\\/:*?"<>|]/g, '').trim() || 'app';

const decodificar = (t: string) => t
    .replace(/&amp;/g, '&').replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

const absoluta = (u: string) => u.startsWith('http') ? u : `${SITIO}${u.startsWith('/') ? '' : '/'}${u}`;

/** Busca apps en el sitio: lee cada tarjeta de resultados (enlace, nombre, versión, icono). */
async function buscarMods(q: string): Promise<Mod[]> {
    const { data: html } = await axios.get(`${SITIO}/?s=${encodeURIComponent(q)}`, { timeout: 20000, headers: UA });
    const mods: Mod[] = [];
    const vistos = new Set<string>();
    for (const bloque of String(html).split('<article').slice(1)) {
        const enlace = bloque.match(/href="\/(apps|games)\/([a-z0-9-]+)"/i);
        if (!enlace) continue;
        const slug = enlace[2];
        if (vistos.has(slug)) continue;
        vistos.add(slug);
        const nombre = decodificar(bloque.match(/card-title[^>]*>\s*<div[^>]*>([^<]+)</i)?.[1] || slug);
        const version = decodificar(bloque.match(/card-excerpt[^>]*>([^<]+)</i)?.[1] || '').split('•')[0].trim().replace(/^v/i, '') || '?';
        const img = bloque.match(/<img[^>]+src="([^"]+)"/i)?.[1] || '';
        const icono = img && !img.includes('default.png') ? absoluta(img) : '';
        mods.push({ slug, nombre, version, icono });
        if (mods.length >= MAX_RESULTADOS) break;
    }
    return mods;
}

/** Enlaces directos del .apk: primero la página de descarga, luego la de la app. */
async function enlacesApk(slug: string): Promise<string[]> {
    const paginas = [`${SITIO}/apps/${slug}/download`, `${SITIO}/apps/${slug}`];
    const enlaces: string[] = [];
    for (const url of paginas) {
        try {
            const { data: html } = await axios.get(url, { timeout: 20000, headers: UA });
            const hallados = [...String(html).matchAll(/href="(https?:\/\/[^"]+\.apk[^"]*)"/gi)].map((x) => x[1]);
            for (const h of hallados) if (!h.includes('apkmody-') && !enlaces.includes(h)) enlaces.push(h);
        } catch { /* se prueba la siguiente página */ }
    }
    return enlaces;
}

/** Nombre y versión de la app desde su página. */
async function datosApp(slug: string): Promise<{ nombre: string; version: string }> {
    const { data: html } = await axios.get(`${SITIO}/apps/${slug}`, { timeout: 20000, headers: UA });
    const titulo = decodificar(String(html).match(/<title>([^<]+)<\/title>/i)?.[1] || slug)
        .replace(/\s*[-|–].*$/, '').replace(/\s*MOD APK.*$/i, '').trim() || slug;
    const version = (decodificar(String(html).match(/"softwareVersion":"([^"]+)"/i)?.[1] || '') || '?').replace(/^v/i, '');
    return { nombre: titulo, version };
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
async function enviarLista(sock: any, chat: string, quoted: any, usedPrefix: string, q: string, mods: Mod[]) {
    const rows = mods.map((a) => ({
        title: a.nombre.slice(0, 40),
        description: `Versión ${a.version} • Desbloqueada`.slice(0, 72),
        id: `${usedPrefix}apkmod id:${a.slug}`
    }));

    const cuerpo = caja('APK MOD', [
        `✧ Búsqueda » *${q}*`,
        `✦ Resultados » *${mods.length}*`,
        '',
        'Elige la app con dinero infinito 🌸'
    ]).replace(/\n> AKAME-MD 🌸$/, '');

    let header: any = undefined;
    const icono = mods.find((a) => a.icono)?.icono;
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
                                sections: [{ title: '💎 APPS MOD', highlight_label: 'MOD', rows }]
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
async function enviarMod(sock: any, m: any, chat: string, slug: string) {
    const destino = path.join(os.tmpdir(), `apkmod-${randomBytes(6).toString('hex')}`);
    try {
        await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });

        const [datos, enlaces] = await Promise.all([datosApp(slug), enlacesApk(slug)]);
        if (!enlaces.length) throw new Error('sin enlace de descarga');

        let ultimoError = 'sin respuesta';
        let bajado = false;
        for (const link of enlaces) {
            const info: Info = { nombre: `${limpiarNombre(datos.nombre)}.apk`, link, tamano: 0, mime: MIME_APK };
            try {
                await descargarArchivo(info, destino);
                bajado = true;
                break;
            } catch (e: any) {
                ultimoError = e?.message || ultimoError;
                if (String(e?.message).includes('más de')) throw e;
                fs.rmSync(destino, { force: true });
            }
        }
        if (!bajado) throw new Error(ultimoError);

        const tamano = fs.statSync(destino).size;
        const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
        await sock.sendMessage(chat, {
            document: { stream: fs.createReadStream(destino) },
            mimetype: MIME_APK,
            fileName: `${limpiarNombre(datos.nombre)}.apk`,
            caption: caja('APK MOD', [
                `✧ *${datos.nombre}*`,
                `✧ *Versión:* ${datos.version}`,
                `✦ Peso » *${mb(tamano)}*`,
                '',
                AVISO
            ])
        }, { quoted: m });
        await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
    } catch (e: any) {
        console.error('[APKMOD ERROR]', e?.message);
        const limite = String(e?.message).includes('más de');
        await sock.sendMessage(chat, {
            text: limite
                ? caja('APK MOD', [`✧ Esa app pesa más de ${Math.round(LIMITE_BYTES / 1024 / 1024)} MB, no la puedo enviar.`])
                : caja('APK MOD', ['✧ No pude descargar esa app.', '✦ Prueba otra vez o elige otra.'])
        }, { quoted: m });
        await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
    } finally {
        limpiar(destino);
    }
}

export default {
    command: ['apkmod', 'apkmodded', 'apkinfinito'],
    description: 'Busca APKs mod (dinero infinito) y elige cuál descargar',
    category: 'download',

    run: async (ctx: any): Promise<void> => {
        const { sock, chat, args, usedPrefix } = ctx;
        const m = ctx.m ?? ctx.msg;

        if (!args?.[0]) {
            await sock.sendMessage(chat, {
                text: caja('APK MOD', [
                    `✧ Usa *${usedPrefix}apkmod <nombre de la app>*`,
                    `✦ Ejemplo: *${usedPrefix}apkmod subway*`,
                    '',
                    AVISO
                ])
            }, { quoted: m });
            return;
        }

        // Selección desde la lista: ".apkmod id:<slug>"
        const sel = String(args[0]).match(/^id:([a-z0-9-]+)$/i);
        if (sel) {
            await enviarMod(sock, m, chat, sel[1].toLowerCase());
            return;
        }

        const q = args.join(' ').trim();
        await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } });

        let mods: Mod[] = [];
        try {
            mods = await buscarMods(q);
        } catch (e: any) {
            console.error('[APKMOD BUSQUEDA]', e?.message);
            await sock.sendMessage(chat, { text: caja('APK MOD', ['✧ No pude buscar ahora.', '✦ Prueba otra vez en un rato.']) }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
            return;
        }

        if (!mods.length) {
            await sock.sendMessage(chat, { text: caja('APK MOD', [`✧ No encontré *${q}*.`, '✦ Prueba con otro nombre.']) }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✘', key: m.key } });
            return;
        }

        await enviarLista(sock, chat, m, usedPrefix, q, mods);
        await sock.sendMessage(chat, { react: { text: '♡', key: m.key } });
    }
};
