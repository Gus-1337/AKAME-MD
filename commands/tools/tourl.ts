import { downloadMediaMessage } from '@whiskeysockets/baileys';
import pino from 'pino';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// Sube la imagen a Pixhost (sin clave). Devuelve el enlace directo de la imagen, no la página.
const subirPixhost = async (buf: Buffer, mime: string): Promise<string> => {
    const form = new FormData();
    form.append('img', new Blob([new Uint8Array(buf)], { type: mime }), `imagen.${mime.split('/')[1] || 'jpg'}`);
    form.append('content_type', '0');
    form.append('max_th_size', '420');
    const res = await fetch('https://api.pixhost.to/images', {
        method: 'POST', body: form, headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(30000)
    });
    const data: any = await res.json().catch(() => null);
    const th: string = data?.th_url || '';
    const m = th.match(/^https:\/\/t(\d+)\.pixhost\.to\/thumbs\/(.+)$/);
    if (!res.ok || !m) throw new Error(`Pixhost HTTP ${res.status}`);
    return `https://img${m[1]}.pixhost.to/images/${m[2]}`;
};

// Sube la imagen a Telegraph (enlace permanente).
const subirTelegraph = async (buf: Buffer, mime: string): Promise<string> => {
    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(buf)], { type: mime }), `imagen.${mime.split('/')[1] || 'jpg'}`);
    const res = await fetch('https://telegra.ph/upload', { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
    const data: any = await res.json().catch(() => null);
    const src = Array.isArray(data) ? data[0]?.src : data?.src;
    if (!res.ok || !src) throw new Error(data?.error || `Telegraph HTTP ${res.status}`);
    return `https://telegra.ph${src}`;
};

const subirCatbox = async (buf: Buffer, mime: string): Promise<string> => {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', new Blob([new Uint8Array(buf)], { type: mime }), `imagen.${mime.split('/')[1] || 'jpg'}`);
    const res = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
    const texto = (await res.text()).trim();
    if (!res.ok || !texto.startsWith('https://')) throw new Error(`Catbox: ${texto || res.status}`);
    return texto;
};

export default {
    command: ['tourl', 'url', 'link'],
    description: 'Convierte una imagen en un enlace directo.',
    category: 'tools',
    run: async ({ chat, m, sock }: any) => {
        const ctx = m?.message?.extendedTextMessage?.contextInfo;
        const quoted = ctx?.quotedMessage;
        const imgMsg = m?.message?.imageMessage || quoted?.imageMessage;

        if (!imgMsg) {
            return sock.sendMessage(chat, {
                text: '   ׄ  ✿  Responde a una *imagen* con .tourl para convertirla en enlace.'
            }, { quoted: m });
        }

        const mime = imgMsg.mimetype || 'image/jpeg';
        const esDirecta = !!m?.message?.imageMessage;
        const origen = esDirecta
            ? { key: m.key, message: m.message }
            : { key: { remoteJid: chat, id: ctx.stanzaId, participant: ctx.participant }, message: quoted };

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: m.key } }).catch(() => {});

            const buf = await downloadMediaMessage(origen as any, 'buffer', {}, {
                logger: pino({ level: 'silent' }),
                reuploadRequest: sock.updateMediaMessage
            }) as Buffer;

            let url: string;
            try {
                url = await subirPixhost(buf, mime);
            } catch {
                try {
                    url = await subirTelegraph(buf, mime);
                } catch {
                    url = await subirCatbox(buf, mime);
                }
            }

            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => {});
            return sock.sendMessage(chat, {
                text: [
                    '˚₊· ͟͟͞͞➳❥ *ENLACE LISTO*',
                    '───────────────',
                    `🔗 ${url}`,
                    '───────────────',
                    '> Enlace directo a la imagen 🌸'
                ].join('\n')
            }, { quoted: m });
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => {});
            return sock.sendMessage(chat, {
                text: `   ׄ  ✿  No se pudo subir la imagen.\n> ${e?.message || 'Error desconocido'}`
            }, { quoted: m });
        }
    }
};
