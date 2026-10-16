import axios from 'axios';
import { stellarUrl } from '../../lib/stellar.ts';

const MAX_BYTES = 400 * 1024 * 1024;
const TIMEOUT_DESCARGA = 120000;
const UA = { 'User-Agent': 'Mozilla/5.0' };
const FB_REGEX = /^https?:\/\/((www|m|web|fb)\.)?(facebook\.com|fb\.watch|fb\.com)\//i;

type Video = { buf: Buffer; calidad?: string; titulo?: string };

const esMp4 = (buf: Buffer) => buf.length > 50000 && buf.subarray(0, 32).indexOf('ftyp') !== -1;

/** Descarga el MP4 completo a memoria y valida que sea video real. */
const bajar = async (url: string): Promise<Buffer> => {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT_DESCARGA,
        maxContentLength: MAX_BYTES,
        maxBodyLength: MAX_BYTES,
        headers: UA
    });
    const buf = Buffer.from(res.data);
    if (!esMp4(buf)) throw new Error('no es video');
    return buf;
};

/** Fuentes en orden de preferencia. Cada una devuelve el video o lanza error. */
const fuentes = (url: string): Array<() => Promise<Video>> => {
    const e = encodeURIComponent(url);
    return [
        // Stellar: a veces entrega el MP4 directo, otras un JSON con enlaces
        async () => {
            const res = await axios.get(stellarUrl('/dl/facebook', { url }), {
                responseType: 'arraybuffer', timeout: 60000, maxContentLength: MAX_BYTES, headers: UA
            });
            const buf = Buffer.from(res.data);
            if (esMp4(buf)) return { buf };
            const d = JSON.parse(buf.toString('utf8'));
            const link = d?.hd || d?.sd || d?.list?.[0]?.url || d?.data?.hd || d?.data?.sd;
            if (typeof link !== 'string' || !link.startsWith('http')) throw new Error('sin enlace');
            return { buf: await bajar(link), calidad: d?.hd ? 'HD' : 'SD' };
        },
        // Delirius: lista con calidad
        async () => {
            const { data } = await axios.get(`https://api.delirius.online/download/facebook?url=${e}`, { timeout: 45000, headers: UA });
            const it = data?.list?.[0];
            if (!it?.url) throw new Error('sin enlace');
            return { buf: await bajar(it.url), calidad: it.quality };
        },
        // Starlights: HD o SD con título
        async () => {
            const { data } = await axios.get(`https://apis-starlights-team.koyeb.app/starlight/facebook?url=${e}`, { timeout: 45000, headers: UA });
            const link = data?.hd || data?.sd;
            if (!link || typeof link !== 'string') throw new Error('sin enlace');
            return { buf: await bajar(link), calidad: data?.hd ? 'HD' : 'SD', titulo: data?.title };
        },
        // FAA: respaldo adicional
        async () => {
            const { data } = await axios.get(`https://api-faa.my.id/faa/fbdownload?url=${e}`, { timeout: 45000, headers: UA });
            const link = data?.result?.media;
            if (!link || typeof link !== 'string') throw new Error('sin enlace');
            return { buf: await bajar(link) };
        }
    ];
};

/** Todas las fuentes a la vez: gana la primera que entregue video válido. Dos rondas. */
const obtenerVideo = async (url: string): Promise<Video> => {
    let ultimo: any = null;
    for (let ronda = 1; ronda <= 2; ronda++) {
        try {
            return await Promise.any(fuentes(url).map((f) => f()));
        } catch (err) { ultimo = err; }
    }
    throw ultimo || new Error('sin video');
};

export default {
    command: ['facebook', 'fb', 'fbdl'],
    category: 'download',
    description: 'Descarga videos de Facebook',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const url = (args || [])[0] || '';
        const p = usedPrefix || '.';

        if (!url) {
            return sock.sendMessage(chat, {
                text: `╭─────────────────╮\n   ✧ *FACEBOOK* ✧\n╰─────────────────╯\n\n❖ Usa: *${p}fb <link de facebook>*\n✦ Ejemplo: *${p}fb https://fb.watch/xxxxx/*`
            }, { quoted: msg });
        }
        if (!FB_REGEX.test(url)) {
            return sock.sendMessage(chat, { text: '✧ Ese link no es de Facebook.' }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } }).catch(() => null);

            const { buf, calidad, titulo } = await obtenerVideo(url);

            const caption =
                '╭─────────────────╮\n' +
                '   ✧ *FACEBOOK VIDEO* ✧\n' +
                '╰─────────────────╯\n\n' +
                (calidad ? `❖ *Calidad:* ${calidad}\n` : '') +
                (titulo ? `✦ *Título:* ${String(titulo).slice(0, 120)}\n` : '') +
                '\n⋆ AKAME-MD ⋆';

            // Envío directo; la reacción ✅ no espera para no retrasar el video
            sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { video: buf, mimetype: 'video/mp4', caption }, { quoted: msg });
        } catch (e: any) {
            console.log('[FB ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude descargar ese video. Prueba con otro link.' }, { quoted: msg });
        }
    }
};
