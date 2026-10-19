import axios from 'axios';
import yts from 'yt-search';
import config from '#config';

const MAX_BYTES = 400 * 1024 * 1024; // 400 MB
const MIN_BYTES = 50 * 1024;         // menos de 50 KB = respuesta basura

const YT_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/;

const YOSOYYO_URL = 'https://api-yosoyyo-api-ofc.onrender.com';
const YOSOYYO_KEY = process.env.YOSOYYO_KEY || 'Akame-proyet';

/** Saca el primer enlace http que encuentre en la respuesta de una API. */
const extraerLink = (d: any): string => {
    const candidatos = [
        d?.data?.download, d?.data?.dl, d?.download, d?.result?.download, d?.result?.url, d?.result?.download_url,
        d?.resultado?.download_url, d?.data?.url, d?.url, d?.link, d?.result?.link
    ];
    for (const c of candidatos) {
        if (typeof c === 'string' && c.startsWith('http')) return c;
        if (typeof c?.url === 'string' && c.url.startsWith('http')) return c.url;
    }
    return '';
};

/** Descarga el video completo a memoria y valida que sea video real. */
const descargar = async (url: string): Promise<Buffer> => {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 90000,
        maxContentLength: MAX_BYTES,
        maxBodyLength: MAX_BYTES,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const buf = Buffer.from(res.data);
    if (buf.length < MIN_BYTES) throw new Error('archivo muy pequeño');
    // Un MP4 real trae la firma 'ftyp' en los primeros bytes (descarta HTML/JSON/páginas de anuncios)
    if (buf.subarray(0, 32).indexOf('ftyp') === -1) throw new Error('no es video mp4');
    return buf;
};

import { stellarUrl } from '../../lib/stellar.ts';

const sources = (videoUrl: string) => {
    const e = encodeURIComponent(videoUrl);
    return {
        principales: [
            `https://api.delirius.online/download/ytmp4?url=${e}`,
            `https://api.starlights.uk/api/download/ytmp4?url=${e}`,
            stellarUrl('/dl/ytmp4', { url: videoUrl })
        ],
        respaldo: `${YOSOYYO_URL}/api/youtube/v2?url=${e}&format=mp4&apiKey=${encodeURIComponent(YOSOYYO_KEY)}`
    };
};

/** yosoyyo: candidatos mp4 de video, de mejor a peor (360p primero, luego el resto). */
const candidatosYosoyyo = (d: any): string[] => {
    const lista = (d?.result?.results || []).filter((r: any) =>
        r?.type === 'video' && r?.extension === 'mp4' && typeof r?.download === 'string' && r.download.startsWith('http'));
    const altura = (r: any) => parseInt(String(r.quality || '').replace(/\D/g, '')) || 0;
    const hasta360 = lista.filter((r: any) => altura(r) <= 360).sort((a: any, b: any) => altura(b) - altura(a));
    const resto = lista.filter((r: any) => altura(r) > 360).sort((a: any, b: any) => altura(a) - altura(b));
    return [...hasta360, ...resto].map((r: any) => r.download).slice(0, 4);
};

/** Pide el enlace a una API y descarga el video. */
const intentar = async (api: string): Promise<Buffer> => {
    const { data } = await axios.get(api, { timeout: 45000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    const link = extraerLink(data);
    if (!link) throw new Error('sin enlace');
    return descargar(link);
};

/** yosoyyo devuelve varios enlaces: prueba cada uno hasta que uno sea un video real. */
const intentarYosoyyo = async (api: string): Promise<Buffer> => {
    const { data } = await axios.get(api, { timeout: 45000, headers: { 'User-Agent': 'Mozilla/5.0' } });
    let ultimo: any = new Error('sin enlaces');
    for (const link of candidatosYosoyyo(data)) {
        try { return await descargar(link); } catch (e) { ultimo = e; }
    }
    throw ultimo;
};

/** Dorratz: pide el enlace y descarga el archivo por su proxy (más estable que el enlace directo). */
const intentarDorratz = async (videoUrl: string, type: 'audio' | 'video', quality: number): Promise<Buffer> => {
    const api = `https://api.dorratz.com/v1/youtube?url=${encodeURIComponent(videoUrl)}&type=${type}&quality=${quality}`;
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

const DVYER_KEY = process.env.DVYER_KEY || '';

/** DVYER: el enlace puede estar "preparándose"; se consulta de nuevo hasta que esté listo (máx. ~40 s). */
const intentarDvyer = async (videoUrl: string): Promise<Buffer> => {
    if (!DVYER_KEY) throw new Error('dvyer sin clave');
    const api = `https://dvyer-api.com/ytmp4?mode=link&quality=360p&url=${encodeURIComponent(videoUrl)}&apikey=${encodeURIComponent(DVYER_KEY)}`;
    for (let intento = 1; intento <= 10; intento++) {
        const { data } = await axios.get(api, { timeout: 30000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (data?.ok === false) throw new Error('dvyer error');
        if (data?.ready && typeof data.download_url === 'string' && data.download_url.startsWith('http')) {
            return descargar(data.download_url);
        }
        await new Promise((r) => setTimeout(r, 4000));
    }
    throw new Error('dvyer no estuvo listo');
};

/** Principales en paralelo; si fallan, respaldo yosoyyo. Dos rondas. */
const getVideo = async (videoUrl: string): Promise<Buffer> => {
    const { principales, respaldo } = sources(videoUrl);
    let ultimo: any = null;
    for (let ronda = 1; ronda <= 2; ronda++) {
        try {
            return await Promise.any([intentarDvyer(videoUrl), ...principales.map((api) => intentar(api)), intentarDorratz(videoUrl, 'video', 360)]);
        } catch (e) { ultimo = e; }
        if (respaldo) {
            try {
                return await intentarYosoyyo(respaldo);
            } catch (e) { ultimo = e; }
        }
    }
    throw new Error(`todas las APIs fallaron: ${ultimo?.message || ''}`);
};

export default {
    command: ['ytmp4', 'video', 'ytv'],
    description: 'Descarga video de YouTube (link o nombre)',
    category: 'download',
    group: true,
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const p = ctx.usedPrefix || ctx.prefix || config.prefix || '.';
        const query = args.join(' ').trim();
        if (!query) return sock.sendMessage(chat, { text: `Usa: ${p}ytmp4 <link o nombre>` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: '🎬', key: msg.key } });

            // Si no es link, busca el primer resultado
            let videoUrl = query;
            const m = query.match(YT_REGEX);
            if (m) {
                videoUrl = `https://youtu.be/${m[1]}`;
            } else {
                const s = await yts(query);
                const v = s.videos?.[0];
                if (!v) throw new Error('sin resultados');
                videoUrl = `https://youtu.be/${v.videoId}`;
            }

            const buffer = await getVideo(videoUrl);
            const sizeMB = buffer.length / (1024 * 1024);

            if (sizeMB > 60) {
                await sock.sendMessage(chat, {
                    document: buffer,
                    mimetype: 'video/mp4',
                    fileName: `yt-${Date.now()}.mp4`,
                    caption: `🎬 Listo - ${sizeMB.toFixed(2)} MB (documento por peso)`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chat, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    caption: '🎬 Listo'
                }, { quoted: msg });
            }

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });
        } catch (e) {
            console.log('[YTMP4 ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: 'ෆ⁠╹⁠ lo siento ocurrido algo al descargar ෆ⁠╹⁠' }, { quoted: msg });
        }
    }
};
