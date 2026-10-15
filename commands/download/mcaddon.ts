import axios from 'axios';

const BUSQUEDA = 'https://api.siputzx.my.id/api/s/mcpedl';
const FORMULARIO = 'https://mcpedl.org/show_file.php';
const LIMITE_MB = 400;
const UA = { 'User-Agent': 'Mozilla/5.0' };

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

/** Busca addons por nombre y deja fuera las APKs del juego. */
async function buscar(q: string): Promise<{ title: string; link: string } | null> {
    const { data } = await axios.get(BUSQUEDA, { params: { q }, timeout: 20000, headers: UA });
    const lista: any[] = data?.data || [];
    return lista.find((r) => r?.link && !/apk/i.test(r.title || '')) || null;
}

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

export default {
    command: ['mcaddon', 'addon'],
    category: 'download',
    description: 'Busca y descarga un addon de Minecraft Bedrock por nombre',
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

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } }).catch(() => null);

            const encontrado = await buscar(q);
            if (!encontrado) {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
                return responder(caja('MCADDON', [`✧ No encontré addons para: *${q}*`]));
            }

            const url = await obtenerArchivo(encontrado.link, encontrado.title);
            if (!url) throw new Error('No encontré el archivo de descarga');

            // Se revisa el tamaño antes de bajarlo completo
            const head = await axios.head(url, { headers: UA, timeout: 20000 }).catch(() => null);
            const bytes = Number(head?.headers?.['content-length'] || 0);
            if (bytes && bytes > LIMITE_MB * 1024 * 1024) {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
                return responder(caja('MCADDON', [`✧ El archivo pesa más de ${LIMITE_MB} MB.`, '✦ No lo puedo enviar.']));
            }

            const archivo = await axios.get(url, { responseType: 'arraybuffer', timeout: 180000, headers: UA });
            const buffer = Buffer.from(archivo.data);
            const ext = (url.match(/\.(mcaddon|mcpack|zip)$/i)?.[1] || 'mcaddon').toLowerCase();
            const nombre = `${encontrado.title.replace(/[\\/:*?"<>|]/g, '').trim() || 'addon'}.${ext}`;

            await sock.sendMessage(chat, {
                document: buffer,
                mimetype: 'application/octet-stream',
                fileName: nombre,
                caption: caja('MCADDON', [
                    `✧ *${encontrado.title}*`,
                    `✦ Tamaño » ${(buffer.length / 1024 / 1024).toFixed(1)} MB`,
                    '✦ Ábrelo en Minecraft Bedrock para importarlo.'
                ])
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch (e: any) {
            console.log('[MCADDON ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await responder(caja('MCADDON', ['✧ No pude descargar ese addon.', '✦ Prueba con otro nombre.']));
        }
    }
};
