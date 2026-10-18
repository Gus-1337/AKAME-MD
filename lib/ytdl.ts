import axios from 'axios';
import { stellarUrl } from './stellar.ts';

/**
 * Descarga de YouTube compartida (audio y video).
 * Todas las fuentes corren en paralelo; gana la primera que entregue un archivo real.
 * Si todas fallan, se registra en consola el motivo de cada una.
 */

const MAX_BYTES = 400 * 1024 * 1024; // 400 MB
const UA = { 'User-Agent': 'Mozilla/5.0' };
const YOSOYYO_URL = 'https://api-yosoyyo-api-ofc.onrender.com';
const YOSOYYO_KEY = process.env.YOSOYYO_KEY || 'Akame-proyet';

/** Saca el primer enlace http útil de la respuesta de cualquier API (sea string u objeto con .url). */
const extraerLink = (d: any): string => {
    const candidatos = [
        d?.data?.download, d?.data?.dl_url, d?.data?.download?.url, d?.data?.dl,
        d?.download, d?.download?.url, d?.result?.download, d?.result?.download_url,
        d?.resultado?.download_url, d?.result?.url, d?.result?.dl, d?.result?.link,
        d?.data?.url, d?.url, d?.link
    ];
    for (const c of candidatos) {
        if (typeof c === 'string' && c.startsWith('http')) return c;
        if (typeof c?.url === 'string' && c.url.startsWith('http')) return c.url;
    }
    return '';
};

const bajar = async (url: string) => {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 120000,
        maxContentLength: MAX_BYTES,
        maxBodyLength: MAX_BYTES,
        headers: UA
    });
    return { buf: Buffer.from(res.data), tipo: String(res.headers['content-type'] || '') };
};

/** Audio: debe ser un archivo de sonido real, no HTML ni JSON. */
const descargarAudio = async (url: string): Promise<Buffer> => {
    const { buf, tipo } = await bajar(url);
    if (buf.length < 20 * 1024) throw new Error('audio muy pequeño');
    if (tipo.includes('text/html') || tipo.includes('application/json')) throw new Error('no es audio');
    return buf;
};

/** Video: debe traer la firma 'ftyp' de un MP4 real en los primeros bytes. */
const descargarVideo = async (url: string): Promise<Buffer> => {
    const { buf } = await bajar(url);
    if (buf.length < 50 * 1024) throw new Error('video muy pequeño');
    if (buf.subarray(0, 32).indexOf('ftyp') === -1) throw new Error('no es video mp4');
    return buf;
};

/** Pide el enlace a una API y descarga el archivo con el validador dado. */
const desdeApi = (api: string, validar: (u: string) => Promise<Buffer>, timeout = 20000) =>
    axios.get(api, { timeout, headers: UA }).then(({ data }) => {
        const link = extraerLink(data);
        if (!link) throw new Error('sin enlace');
        return validar(link);
    });

/** Dorratz: proxy primero, enlace directo después. */
const desdeDorratz = async (videoUrl: string, type: 'audio' | 'video', quality: number, validar: (u: string) => Promise<Buffer>) => {
    const api = `https://api.dorratz.com/v1/youtube?url=${encodeURIComponent(videoUrl)}&type=${type}&quality=${quality}`;
    const { data } = await axios.get(api, { timeout: 25000, headers: UA });
    if (!data?.ok || !data?.data) throw new Error('dorratz sin resultado');
    const candidatos = [
        data.data.proxy ? `https://api.dorratz.com${data.data.proxy}` : '',
        typeof data.data.download === 'string' ? data.data.download : ''
    ].filter((l) => l.startsWith('http'));
    let ultimo: any = new Error('dorratz sin enlaces');
    for (const l of candidatos) {
        try { return await validar(l); } catch (e) { ultimo = e; }
    }
    throw ultimo;
};

/** yosoyyo: devuelve varios enlaces mp4; prueba hasta 4 hasta que uno sea video real. */
const desdeYosoyyoVideo = async (videoUrl: string) => {
    const api = `${YOSOYYO_URL}/api/youtube/v2?url=${encodeURIComponent(videoUrl)}&format=mp4&apiKey=${encodeURIComponent(YOSOYYO_KEY)}`;
    const { data } = await axios.get(api, { timeout: 45000, headers: UA });
    const altura = (r: any) => parseInt(String(r.quality || '').replace(/\D/g, '')) || 0;
    const lista = (data?.result?.results || [])
        .filter((r: any) => r?.type === 'video' && r?.extension === 'mp4' && typeof r?.download === 'string' && r.download.startsWith('http'))
        .sort((a: any, b: any) => {
            const ea = altura(a) <= 360 ? 0 : 1, eb = altura(b) <= 360 ? 0 : 1;
            return ea !== eb ? ea - eb : (ea === 0 ? altura(b) - altura(a) : altura(a) - altura(b));
        })
        .slice(0, 4);
    let ultimo: any = new Error('yosoyyo sin enlaces');
    for (const r of lista) {
        try { return await descargarVideo(r.download); } catch (e) { ultimo = e; }
    }
    throw ultimo;
};

const desdeYosoyyoAudio = (videoUrl: string) =>
    desdeApi(`${YOSOYYO_URL}/api/youtube/v2?url=${encodeURIComponent(videoUrl)}&format=mp3&apiKey=${encodeURIComponent(YOSOYYO_KEY)}`,
        descargarAudio, 45000);

/** Corre varias fuentes en paralelo, dos rondas. Si todas fallan, lanza error con el motivo. */
const enParalelo = async (nombre: string, tareas: Array<[string, () => Promise<Buffer>]>): Promise<Buffer> => {
    let ultimo: any = null;
    for (let ronda = 1; ronda <= 2; ronda++) {
        try {
            return await Promise.any(tareas.map(([id, fn]) =>
                fn().catch((e) => { throw new Error(`${id}: ${e?.message || 'error'}`); })));
        } catch (e) {
            ultimo = e;
        }
    }
    const motivos = (ultimo?.errors || []).map((e) => e.message).slice(0, 6).join(' | ');
    console.log(`[YTDL ${nombre}] todas fallaron → ${motivos}`);
    throw new Error(`todas las APIs fallaron${motivos ? ': ' + motivos : ''}`);
};

/** Audio MP3 completo de un video de YouTube. */
export const getAudioBuffer = (videoUrl: string): Promise<Buffer> => {
    const e = encodeURIComponent(videoUrl);
    return enParalelo('AUDIO', [
        ['delirius', () => desdeApi(`https://api.delirius.online/download/ytmp3?url=${e}`, descargarAudio)],
        ['gohan', () => desdeApi(`https://api-gohan-v1.onrender.com/download/ytaudio?url=${e}&download=true`, descargarAudio)],
        ['ryuzei', () => desdeApi(`https://api.ryuzei.xyz/download/ytmp3/v4?url=${e}&quality=64`, descargarAudio)],
        ['starlights', () => desdeApi(`https://api.starlights.uk/api/download/ytmp3?url=${e}`, descargarAudio)],
        ['starlights-v2', () => desdeApi(`https://api.starlights.uk/api/download/ytmp3v2?url=${e}`, descargarAudio)],
        ['yosoyyo', () => desdeYosoyyoAudio(videoUrl)],
        ['dorratz', () => desdeDorratz(videoUrl, 'audio', 128, descargarAudio)]
    ]);
};

/** Video MP4 completo de un video de YouTube (360p).
 * Fuentes principales al mismo tiempo. Stellar entra a los 6 s si aún no hay video
 * (así no baja la calidad cuando las principales responden, y no espera de más si fallan).
 */
export const getVideoBuffer = async (videoUrl: string): Promise<Buffer> => {
    const e = encodeURIComponent(videoUrl);
    const principales: Array<[string, () => Promise<Buffer>]> = [
        ['delirius', () => desdeApi(`https://api.delirius.online/download/ytmp4?url=${e}`, descargarVideo, 45000)],
        ['starlights', () => desdeApi(`https://api.starlights.uk/api/download/ytmp4?url=${e}`, descargarVideo, 45000)],
        ['yosoyyo', () => desdeYosoyyoVideo(videoUrl)],
        ['dorratz', () => desdeDorratz(videoUrl, 'video', 360, descargarVideo)]
    ];
    const stellar = () => desdeApi(stellarUrl('/dl/ytmp4', { url: videoUrl }), descargarVideo, 45000);

    let timer: ReturnType<typeof setTimeout> | null = null;
    const conRetardo = new Promise<Buffer>((resolve, reject) => {
        timer = setTimeout(() => stellar().then(resolve, reject), 6000);
    });
    const tareas: Array<Promise<Buffer>> = principales.map(([id, fn]) =>
        fn().catch((err) => { throw new Error(`${id}: ${err?.message || 'error'}`); }));
    tareas.push(conRetardo.catch((err) => { throw new Error(`stellar: ${err?.message || 'error'}`); }));

    try {
        return await Promise.any(tareas);
    } catch (err: any) {
        const motivos = (err?.errors || []).map((x: any) => x.message).slice(0, 6).join(' | ');
        console.log(`[YTDL VIDEO] todas fallaron → ${motivos}`);
        throw new Error(`todas las APIs fallaron${motivos ? ': ' + motivos : ''}`);
    } finally {
        if (timer) clearTimeout(timer);
    }
};
