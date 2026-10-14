import { generateWAMessageFromContent, generateWAMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import axios from 'axios';
import crypto from 'crypto';

const MAX_VIDEOS = 10;
const WORKERS = 6;                  // descargas simultáneas
const MAX_BYTES = 45 * 1024 * 1024; // descarta videos muy pesados
const TIMEOUT_BAJADA = 20000;

/** Convierte cualquier forma de respuesta de búsqueda de TikTok a un formato común. */
const normalizar = (v: any) => ({
    title: String(v?.title || v?.desc || v?.titulo || v?.description || '').trim(),
    nowm: v?.url_nowm || v?.nowm || v?.no_watermark || v?.play || v?.video || v?.url || '',
    wm: v?.url_wm || v?.wm || v?.hdplay || '',
    autor: v?.author?.username || v?.author?.nickname || (typeof v?.author === 'string' ? v.author : '') || ''
});

const extraerLista = (d: any) => {
    const arr = [d?.result, d?.resultado, d?.results, d?.data, d?.data?.data, d?.data?.results, d]
        .find((x) => Array.isArray(x) && x.length);
    if (!arr) throw new Error('sin resultados');
    const lista = arr.map(normalizar).filter((v) => v.nowm.startsWith('http') || v.wm.startsWith('http'));
    if (!lista.length) throw new Error('sin videos');
    return lista;
};

const UA = { 'User-Agent': 'Mozilla/5.0' };

/** Varias APIs de búsqueda en paralelo; gana la primera que devuelva videos. */
const buscar = (q: string) => {
    const e = encodeURIComponent(q);
    return Promise.any([
        axios.get(`https://api-faa.my.id/faa/tiktok-search?q=${e}`, { timeout: 15000, headers: UA })
            .then((r) => extraerLista(r.data)),
        axios.get(`https://api.delirius.online/search/tiktoksearch?query=${e}`, { timeout: 15000, headers: UA })
            .then((r) => extraerLista(r.data)),
        axios.get(`https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${e}`, { timeout: 15000, headers: UA })
            .then((r) => extraerLista(r.data)),
        axios.get(`https://api.melodiaauris.qzz.io/v1/search/tiktok?q=${e}`, { timeout: 15000, headers: { ...UA, Authorization: 'Bearer OguriCap-Bot' } })
            .then((r) => extraerLista(r.data))
    ]).catch((err) => {
        console.log('[TTSEARCH] búsqueda fallida:', err?.errors?.map((x) => x.message).join(' | '));
        throw new Error('no pude buscar en TikTok, intenta de nuevo');
    });
};

/** Descarga un video; prueba sin marca de agua y luego con marca. Devuelve null si ambos fallan. */
const bajarVideo = async (v: ReturnType<typeof normalizar>) => {
    for (const url of [v.nowm, v.wm].filter((u) => u.startsWith('http'))) {
        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: TIMEOUT_BAJADA,
                maxContentLength: MAX_BYTES,
                maxBodyLength: MAX_BYTES,
                headers: { ...UA, Referer: 'https://www.tiktok.com/' }
            });
            const buffer = Buffer.from(res.data);
            if (buffer.length < 10 * 1024) continue; // respuesta vacía
            return { buffer, titulo: v.title || 'TikTok', autor: v.autor };
        } catch {
            // prueba la siguiente URL
        }
    }
    return null;
};

/** Descarga en paralelo (WORKERS a la vez) y devuelve los primeros MAX_VIDEOS válidos, en orden. */
const bajarTodos = async (candidatos: ReturnType<typeof normalizar>[]) => {
    const ok: { i: number; video: any }[] = [];
    let siguiente = 0;
    const worker = async () => {
        while (ok.length < MAX_VIDEOS && siguiente < candidatos.length) {
            const i = siguiente++;
            const video = await bajarVideo(candidatos[i]);
            if (video) ok.push({ i, video });
        }
    };
    await Promise.all(Array.from({ length: WORKERS }, worker));
    return ok.sort((a, b) => a.i - b.i).slice(0, MAX_VIDEOS).map((x) => x.video);
};

const tarjeta = (query: string, total: number) =>
`˚₊· ͟͟͞͞➳❥ *TIKTOK SEARCH*
───────────────
✧ Búsqueda » ${query}
✦ Videos » ${total}
✩ Formato » álbum
───────────────
> AKAME-MD 🌸`;

export default {
    command: ['ttsearch', 'tiktoksearch', 'tts'],
    category: 'download',
    description: 'busca videos en tiktok',
    run: async (ctx) => {
        const { sock, msg, chat, args, jid } = ctx;
        const targetJid = jid || chat;
        const query = args.join(' ').trim();
        if (!query) return sock.sendMessage(chat, { text: `🌸 Ingresa una búsqueda\nEjemplo: .tts goku` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: '🔍', key: msg.key } });

            const lista = await buscar(query);
            const buffers = await bajarTodos(lista);
            if (!buffers.length) throw new Error('no pude descargar ningún video');

            // 1. Abrir álbum
            const opener = generateWAMessageFromContent(targetJid, {
                messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                albumMessage: { expectedImageCount: 0, expectedVideoCount: buffers.length }
            }, { userJid: jidNormalizedUser(sock.user.id), quoted: msg, upload: sock.waUploadToServer });

            await sock.relayMessage(targetJid, opener.message, { messageId: opener.key.id });

            // 2. Subir todos los videos en paralelo
            const hijos = await Promise.all(buffers.map((b, i) =>
                generateWAMessage(targetJid, {
                    video: b.buffer,
                    mimetype: 'video/mp4',
                    caption: i === 0
                        ? tarjeta(query, buffers.length)
                        : `🎬 ${i + 1}/${buffers.length}${b.autor ? ` · @${b.autor}` : ''}`
                }, { upload: sock.waUploadToServer })
            ));

            // 3. Enviarlos en orden, asociados al álbum
            for (const child of hijos) {
                child.message.messageContextInfo = {
                    messageSecret: crypto.randomBytes(32),
                    messageAssociation: { associationType: 1, parentMessageKey: opener.key }
                };
                await sock.relayMessage(targetJid, child.message, { messageId: child.key.id });
            }

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.log('[TT ALBUM ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: `🌸 ${e?.message || 'Error al buscar'}` }, { quoted: msg });
        }
    }
};
