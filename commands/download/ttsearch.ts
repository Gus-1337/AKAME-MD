import { generateWAMessageFromContent, generateWAMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import axios from 'axios';
import crypto from 'crypto';
import { stellarUrl } from '../../lib/stellar.ts';

const MAX_VIDEOS = 15;
const WORKERS = 15;                 // descargas simultáneas
const MAX_BYTES = 45 * 1024 * 1024; // descarta videos muy pesados
const TIMEOUT_BAJADA = 12000;
const TIMEOUT_BUSQUEDA = 10000;
const ESPERA_EXTRA = 2500;          // tras la primera respuesta, espera un poco más a las demás fuentes

const DVYER_KEY = process.env.DVYER_KEY || '';

type Video = { title: string; nowm: string; wm: string; autor: string; pagina: string };

/** Convierte cualquier forma de respuesta de búsqueda de TikTok a un formato común. */
const normalizar = (v: any): Video => ({
    title: String(v?.title || v?.desc || v?.titulo || v?.description || '').trim(),
    nowm: v?.url_nowm || v?.nowm || v?.no_watermark || v?.dl || v?.play || v?.video || v?.url || '',
    wm: v?.url_wm || v?.wm || v?.hdplay || v?.watermark || '',
    autor: v?.author?.username || v?.author?.nickname || (typeof v?.author === 'string' ? v.author : '') || v?.username || '',
    // DVYER solo da la página del video; el archivo se pide al descargar
    pagina: v?.video_url || ''
});

const extraerLista = (d: any): Video[] => {
    const arr = [d?.result, d?.resultado, d?.results, d?.data, d?.data?.data, d?.data?.results, d]
        .find((x) => Array.isArray(x) && x.length);
    if (!arr) throw new Error('sin resultados');
    const lista = arr.map(normalizar).filter((v: Video) =>
        v.nowm.startsWith('http') || v.wm.startsWith('http') || (DVYER_KEY && v.pagina.startsWith('http')));
    if (!lista.length) throw new Error('sin videos');
    return lista;
};

const UA = { 'User-Agent': 'Mozilla/5.0' };

/** Búsquedas en paralelo. Con la primera respuesta válida, espera ESPERA_EXTRA ms más a las demás y junta resultados. */
const buscar = (q: string): Promise<Video[]> => {
    const e = encodeURIComponent(q);
    const fuentes: Promise<Video[]>[] = [
        // Stellar: trae el enlace directo del video en la misma búsqueda
        axios.get(stellarUrl('/search/tiktok', { query: q }), { timeout: TIMEOUT_BUSQUEDA, headers: UA })
            .then((r) => extraerLista(r.data)),
        axios.get(`https://api.delirius.online/search/tiktoksearch?query=${e}`, { timeout: TIMEOUT_BUSQUEDA, headers: UA })
            .then((r) => extraerLista(r.data)),
        axios.get(`https://apis-starlights-team.koyeb.app/starlight/tiktoksearch?text=${e}`, { timeout: TIMEOUT_BUSQUEDA, headers: UA })
            .then((r) => extraerLista(r.data)),
        axios.get(`https://api.melodiaauris.qzz.io/v1/search/tiktok?q=${e}`, { timeout: TIMEOUT_BUSQUEDA, headers: { ...UA, Authorization: 'Bearer OguriCap-Bot' } })
            .then((r) => extraerLista(r.data))
    ];
    if (DVYER_KEY) {
        fuentes.push(
            axios.get(`https://dvyer-api.com/tiktok/search?q=${e}&apikey=${encodeURIComponent(DVYER_KEY)}`, { timeout: TIMEOUT_BUSQUEDA, headers: UA })
                .then((r) => extraerLista(r.data))
        );
    }

    return new Promise((resolve, reject) => {
        const juntados: Video[] = [];
        const errores: string[] = [];
        let pendientes = fuentes.length;
        let primera = false;
        let timer: NodeJS.Timeout | null = null;

        const terminar = () => {
            if (timer) clearTimeout(timer);
            if (!juntados.length) return reject(new Error('no pude buscar en TikTok, intenta de nuevo'));
            // Primero los que traen enlace directo (más rápidos), luego los que requieren resolver (DVYER)
            const directos = juntados.filter((v) => v.nowm.startsWith('http') || v.wm.startsWith('http'));
            const resto = juntados.filter((v) => !(v.nowm.startsWith('http') || v.wm.startsWith('http')));
            const vistos = new Set<string>();
            const unicos = [...directos, ...resto].filter((v) => {
                const clave = v.nowm || v.wm || v.pagina;
                if (vistos.has(clave)) return false;
                vistos.add(clave);
                return true;
            });
            resolve(unicos);
        };

        fuentes.forEach((p, i) => {
            p.then((lista) => {
                juntados.push(...lista);
                if (!primera) {
                    primera = true;
                    timer = setTimeout(terminar, ESPERA_EXTRA);
                }
            }).catch((err) => {
                errores.push(err?.message || 'error');
            }).finally(() => {
                pendientes--;
                if (pendientes === 0) {
                    if (!primera) console.log('[TTSEARCH] búsqueda fallida:', errores.join(' | '));
                    terminar();
                }
            });
        });
    });
};

/** Obtiene el archivo de un video de DVYER (espera a que el enlace esté listo). */
const resolverDvyer = async (pagina: string): Promise<string> => {
    const api = `https://dvyer-api.com/ttdlmp4?url=${encodeURIComponent(pagina)}&mode=link&apikey=${encodeURIComponent(DVYER_KEY)}`;
    for (let intento = 1; intento <= 6; intento++) {
        const { data } = await axios.get(api, { timeout: 20000, headers: UA });
        if (data?.ok === false) break;
        if (data?.ready !== false && typeof data?.download_url === 'string' && data.download_url.startsWith('http')) {
            return data.download_url;
        }
        await new Promise((r) => setTimeout(r, 2500));
    }
    return '';
};

/** Descarga un video; prueba sin marca de agua y luego con marca. Devuelve null si todo falla. */
const bajarVideo = async (v: Video) => {
    const urls = [v.nowm, v.wm].filter((u) => u.startsWith('http'));
    if (!urls.length && v.pagina && DVYER_KEY) {
        try {
            const url = await resolverDvyer(v.pagina);
            if (url) urls.push(url);
        } catch {
            // sin enlace de DVYER
        }
    }
    for (const url of urls) {
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
const bajarTodos = async (candidatos: Video[]) => {
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
    run: async (ctx: any): Promise<any> => {
        const { sock, msg, chat, args, jid } = ctx;
        const targetJid = jid || chat;
        const query = args.join(' ').trim();
        if (!query) return sock.sendMessage(chat, { text: `🌸 Ingresa una búsqueda\nEjemplo: .tts goku` }, { quoted: msg });

        // Si es un link de TikTok, se descarga igual que .tt
        if (/(?:tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)/i.test(query)) {
            const tiktok = (await import('./Tiktok.ts')).default;
            return tiktok.run({ ...ctx, m: msg });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '🔍', key: msg.key } });

            const t0 = Date.now();
            const lista = await buscar(query);
            const tBusca = Date.now();
            const buffers = await bajarTodos(lista);
            const tBaja = Date.now();
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

            console.log(`[TTSEARCH] buscar ${((tBusca - t0) / 1000).toFixed(1)}s · bajar ${((tBaja - tBusca) / 1000).toFixed(1)}s · subir+enviar ${((Date.now() - tBaja) / 1000).toFixed(1)}s · ${buffers.length} videos`);
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.log('[TT ALBUM ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: `🌸 ${e?.message || 'Error al buscar'}` }, { quoted: msg });
        }
    }
};
