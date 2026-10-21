import axios from 'axios';
import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';

const BUSQUEDA = 'https://api.siputzx.my.id/api/s/mcpedl';
const FORMULARIO = 'https://mcpedl.org/show_file.php';
const LIMITE_MB = 400;
const MAX_RESULTADOS = 5;
const UA = { 'User-Agent': 'Mozilla/5.0' };

type Addon = { title: string; link: string; image?: string };

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

/** Busca addons por nombre, deja fuera las APKs del juego y devuelve hasta MAX_RESULTADOS. */
async function buscar(q: string): Promise<Addon[]> {
    const { data } = await axios.get(BUSQUEDA, { params: { q }, timeout: 20000, headers: UA });
    const lista: any[] = data?.data || [];
    return lista
        .filter((r) => r?.link && !/apk/i.test(r.title || ''))
        .slice(0, MAX_RESULTADOS)
        .map((r) => ({ title: String(r.title || 'addon'), link: String(r.link), image: r.image || undefined }));
}

/** Solo links de mcpedl (la lista y los botones solo generan links de ese sitio). */
const esLinkMcpedl = (url: string) => /^https:\/\/(www\.)?mcpedl\.org\//i.test(url);

/** Entra a la página del addon y pide el archivo por el formulario de descarga. */
async function obtenerArchivo(pagina: string, titulo: string): Promise<string | null> {
    const pag = await axios.get(pagina, { timeout: 20000, headers: UA, responseType: 'text' });
    const html: string = pag.data;
    const seccion = html.slice(html.indexOf('id="download-link"'));
    const fileId = seccion.match(/name="file_id" value="(\d+)"/)?.[1];
    if (!fileId) return null;

    const body = new URLSearchParams({ post_title: titulo, file_id: fileId, post_url: pagina });
    const res = await axios.post(FORMULARIO, body.toString(), {
        timeout: 20000,
        headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded', Referer: pagina },
        responseType: 'text'
    });
    return String(res.data).match(/https?:\/\/file\.mcpedl\.org\/[^"'\s<]+\.(?:mcaddon|mcpack|zip)/i)?.[0] || null;
}

/** Manda la lista con selección única y la imagen del primer resultado. */
async function enviarLista(sock: any, chat: string, quoted: any, usedPrefix: string, q: string, addons: Addon[]) {
    const rows = addons.map((a, i) => ({
        title: `${i + 1}. ${a.title}`.slice(0, 40),
        description: 'Addon de Minecraft Bedrock'.slice(0, 72),
        id: `${usedPrefix}mcaddon link:${a.link}`
    }));

    const cuerpo = caja('MCADDON', [
        `✧ Búsqueda » *${q}*`,
        `✦ Resultados » *${addons.length}*`,
        '',
        'Elige el addon que quieres descargar 🌸'
    ]).replace(/\n> AKAME-MD 🌸$/, '');

    let header: any = undefined;
    const imagen = addons.find((a) => a.image)?.image;
    if (imagen) {
        try {
            const media = await prepareWAMessageMedia({ image: { url: imagen } }, { upload: sock.waUploadToServer });
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
                    footer: { text: 'AKAME MD • Elige un addon' },
                    ...(header ? { header } : {}),
                    nativeFlowMessage: {
                        buttons: [{
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: 'Elegir addon',
                                sections: [{ title: '🧱 ADDONS ENCONTRADOS', highlight_label: 'MCADDON', rows }]
                            })
                        }]
                    }
                }
            }
        }
    }, opciones);

    await sock.relayMessage(chat, list.message, { messageId: list.key.id });
}

/** Descarga un addon de mcpedl y lo manda como documento. */
async function enviarAddon(sock: any, msg: any, chat: string, pagina: string, titulo: string) {
    const url = await obtenerArchivo(pagina, titulo);
    if (!url) throw new Error('No encontré el archivo de descarga');

    // Se revisa el tamaño antes de bajarlo completo
    const head = await axios.head(url, { headers: UA, timeout: 20000 }).catch(() => null);
    const bytes = Number(head?.headers?.['content-length'] || 0);
    if (bytes && bytes > LIMITE_MB * 1024 * 1024) {
        await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
        return sock.sendMessage(chat, { text: caja('MCADDON', [`✧ El archivo pesa más de ${LIMITE_MB} MB.`, '✦ No lo puedo enviar.']) }, { quoted: msg });
    }

    const archivo = await axios.get(url, { responseType: 'arraybuffer', timeout: 180000, headers: UA });
    const buffer = Buffer.from(archivo.data);
    const ext = (url.match(/\.(mcaddon|mcpack|zip)$/i)?.[1] || 'mcaddon').toLowerCase();
    const nombre = `${titulo.replace(/[\\/:*?"<>|]/g, '').trim() || 'addon'}.${ext}`;

    await sock.sendMessage(chat, {
        document: buffer,
        mimetype: 'application/octet-stream',
        fileName: nombre,
        caption: caja('MCADDON', [
            `✧ *${titulo}*`,
            `✦ Tamaño » ${(buffer.length / 1024 / 1024).toFixed(1)} MB`,
            '✦ Ábrelo en Minecraft Bedrock para importarlo.'
        ])
    }, { quoted: msg });
}

export default {
    command: ['mcaddon', 'addon'],
    category: 'download',
    description: 'Busca addons de Minecraft Bedrock por nombre y elige cuál descargar',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const responder = (texto: string) => sock.sendMessage(chat, { text: texto }, { quoted: msg });
        const q = (args || []).join(' ').trim();

        if (!q) {
            return responder(caja('MCADDON', [
                `✧ Usa *${usedPrefix}mcaddon <nombre>*`,
                `✦ Ejemplo: *${usedPrefix}mcaddon zombies*`
            ]));
        }

        // Botón de la lista: descarga el addon elegido
        if (q.startsWith('link:')) {
            const pagina = q.slice(5).trim();
            if (!esLinkMcpedl(pagina)) {
                return responder(caja('MCADDON', ['✧ Ese link no es de mcpedl.']));
            }
            try {
                await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } }).catch(() => null);
                const titulo = decodeURIComponent(pagina.split('/').filter(Boolean).pop() || 'addon').replace(/-/g, ' ');
                await enviarAddon(sock, msg, chat, pagina, titulo);
                await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
            } catch (e: any) {
                console.log('[MCADDON ERROR]', e?.message);
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
                await responder(caja('MCADDON', ['✧ No pude descargar ese addon.', '✦ Prueba con otro.']));
            }
            return;
        }

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } }).catch(() => null);

            const addons = await buscar(q);
            if (!addons.length) {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
                return responder(caja('MCADDON', [`✧ No encontré addons para: *${q}*`]));
            }

            await enviarLista(sock, chat, msg, usedPrefix, q, addons);
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch (e: any) {
            console.log('[MCADDON ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await responder(caja('MCADDON', ['✧ No pude buscar addons.', '✦ Prueba de nuevo en un momento.']));
        }
    }
};
