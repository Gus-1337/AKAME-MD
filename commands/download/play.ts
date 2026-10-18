import yts from 'yt-search';
import axios from 'axios';
import { stellarUrl } from '../../lib/stellar.ts';

const MAX_BYTES = 400 * 1024 * 1024;   // 400 MB (canciones largas, ej. 20 min)
const MIN_BYTES = 20 * 1024;           // menos de 20 KB = respuesta basura
const DOC_BYTES = 16 * 1024 * 1024;    // por encima de esto se manda como documento
const TIMEOUT_DESCARGA = 120000;

const formatViews = (v) =>
    v >= 1e9 ? (v / 1e9).toFixed(1) + 'B' :
    v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' :
    v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : String(v ?? 0);

const limpiarNombre = (t) => (String(t || 'audio')).replace(/[\\\\/:*?\"<>|]/g, '').trim().slice(0, 80) || 'audio';

/** Saca el enlace de descarga de la respuesta de cualquier API. */
const extraerLink = (d) => {
    const c = d?.result?.download_url || d?.resultado?.download_url || d?.data?.download || d?.data?.dl ||
        d?.result?.download || d?.download || d?.url || '';
    return typeof c === 'string' && c.startsWith('http') ? c : '';
};

/** Descarga el audio completo a memoria y valida que sea un MP3 real. */
const descargar = async (url) => {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT_DESCARGA,
        maxContentLength: MAX_BYTES,
        maxBodyLength: MAX_BYTES,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const buf = Buffer.from(res.data);
    if (buf.length < MIN_BYTES) throw new Error('archivo muy pequeño');
    const tipo = String(res.headers['content-type'] || '');
    if (tipo.includes('text/html') || tipo.includes('application/json')) throw new Error('no es audio');
    return buf;
};

/** Pide el enlace a una API y descarga el audio. */
const pedirAudio = async (api) => {
    const { data } = await axios.get(api, { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const link = extraerLink(data);
    if (!link) throw new Error('sin enlace');
    return descargar(link);
};

/** Dorratz: intenta primero el proxy y luego el enlace directo. */
const pedirDorratz = async (videoUrl) => {
    const api = `https://api.dorratz.com/v1/youtube?url=${encodeURIComponent(videoUrl)}&type=audio&quality=128`;
    const { data } = await axios.get(api, { timeout: 25000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!data?.ok || !data?.data) throw new Error('dorratz sin resultado');
    const candidatos = [
        data.data.proxy ? `https://api.dorratz.com${data.data.proxy}` : '',
        typeof data.data.download === 'string' ? data.data.download : ''
    ].filter((l) => l.startsWith('http'));
    let ultimo: any = new Error('dorratz sin enlaces');
    for (const l of candidatos) {
        try { return await descargar(l); } catch (e) { ultimo = e; }
    }
    throw ultimo;
};

/** Todas las fuentes en paralelo: gana la primera que entregue el audio completo. */
const getAudio = async (videoUrl) => {
    const enc = encodeURIComponent(videoUrl);
    const apis = [
        `https://api.delirius.online/download/ytmp3?url=${enc}`,
        `https://api-gohan-v1.onrender.com/download/ytaudio?url=${enc}&download=true`,
        `https://api.starlights.uk/api/download/ytmp3?url=${enc}`,
        `https://api-gohan-v1.onrender.com/download/ytaudio?url=${enc}`,
        stellarUrl('/dl/ytmp3', { url: videoUrl })
    ];

    let ultimo: any = null;
    for (let intento = 1; intento <= 2; intento++) {
        const tareas = [...apis.map(pedirAudio), pedirDorratz(videoUrl)];
        try {
            return await Promise.any(tareas);
        } catch (err) {
            ultimo = err; // segunda ronda si todas fallaron
        }
    }
    const primerError = ultimo?.errors?.[0]?.message;
    throw new Error(`todas las APIs fallaron${primerError ? ': ' + primerError : ''}`);
};

export default {
    command: ['play', 'audio'],
    description: 'Busca en YouTube y te manda el audio',
    category: 'download',
    group: true,
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const query = args.join(' ').trim();
        if (!query) return sock.sendMessage(chat, { text: `ꕤ Ingresa nombre o link` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: '🎧', key: msg.key } });

            const search = await yts(query);
            const video = search.videos?.[0];
            if (!video) {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
                return sock.sendMessage(chat, { text: `❌ No encontré resultados para *${query}*` }, { quoted: msg });
            }
            if (!video.seconds) {
                // Duración 0 = directo (en vivo): no se puede bajar como archivo
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
                return sock.sendMessage(chat, { text: `❌ *${video.title}* es un directo (en vivo) y no se puede descargar. Busca otra versión.` }, { quoted: msg });
            }
            const videoUrl = `https://youtu.be/${video.videoId}`;
            const titulo = limpiarNombre(video.title);

            // La tarjeta sale ya, mientras se descarga el audio
            const tarjeta = sock.sendMessage(chat, {
                image: { url: video.thumbnail },
                caption: `*${video.title}*\n\n✿ Canal » ${video.author?.name || 'Desconocido'}\n✿ Vistas » ${formatViews(video.views)}\n✿ Duración » ${video.timestamp || '?'}\n✿ Link » ${videoUrl}\n\n_Enviando audio..._`
            }, { quoted: msg }).catch(() => null);

            const audio = await getAudio(videoUrl);
            await tarjeta;

            if (audio.length > DOC_BYTES) {
                // Archivos grandes: como documento para que WhatsApp no lo rechace
                await sock.sendMessage(chat, {
                    document: audio,
                    mimetype: 'audio/mpeg',
                    fileName: `${titulo}.mp3`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chat, {
                    audio,
                    mimetype: 'audio/mpeg',
                    fileName: `${titulo}.mp3`,
                    ptt: false
                }, { quoted: msg });
            }

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.log('[PLAY ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: `❌ Error al descargar, intenta de nuevo` }, { quoted: msg });
        }
    }
};
