import axios from 'axios';
import { stellarUrl } from '../../lib/stellar.ts';

const UA = { 'User-Agent': 'Mozilla/5.0' };
const MAX_BYTES = 60 * 1024 * 1024;
const esLinkSpotify = (t: string) => /open\.spotify\.com\/track\//i.test(t);

/** Busca la canción en Spotify (Stellar) y devuelve el primer resultado. */
async function buscar(query: string): Promise<{ url: string } | null> {
    const { data } = await axios.get(stellarUrl('/search/spotify', { query }), { timeout: 15000, headers: UA });
    const primero = data?.data?.[0];
    return data?.status && primero?.url ? { url: primero.url } : null;
}

/** Pide el enlace de descarga del audio para una canción de Spotify. */
async function pedirAudio(urlSpotify: string) {
    const { data } = await axios.get(stellarUrl('/dl/spotify', { url: urlSpotify }), { timeout: 30000, headers: UA });
    const info = data?.data;
    if (!data?.status || !info?.dl) throw new Error('No pude obtener el audio');
    return info as { title: string; artist: string; album: string; cover: string; dl: string };
}

/** Descarga el MP3 completo. */
async function bajarMp3(url: string): Promise<Buffer> {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000, maxContentLength: MAX_BYTES, maxBodyLength: MAX_BYTES, headers: UA });
    const buf = Buffer.from(res.data);
    if (buf.length < 10 * 1024) throw new Error('audio vacío');
    return buf;
}

const tarjeta = (info: { title: string; artist: string; album: string }) =>
`˚₊· ͟͟͞͞➳❥ *SPOTIFY PLAY* ♡
───────────────
✧ Canción » ${info.title || 'Sin título'}
✦ Artista » ${info.artist || 'Desconocido'}
✩ Álbum » ${info.album || 'Desconocido'}
♡ ¡Descargando! ♡
───────────────
> AKAME-MD 🌸`;

export default {
    command: ['splay'],
    category: 'download',
    description: 'Busca una canción en Spotify y la envía en audio (rápido)',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const entrada = (args || []).join(' ').trim();

        if (!entrada) {
            return sock.sendMessage(chat, {
                text: `˚₊· ͟͟͞͞➳❥ *SPOTIFY PLAY*\n───────────────\n✧ Usa » ${usedPrefix}splay <canción o artista>\n✦ Ej » ${usedPrefix}splay monaco bad bunny\n✦ Ej » ${usedPrefix}splay https://open.spotify.com/track/...\n───────────────\n> AKAME-MD 🌸`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } }).catch(() => {});

            let urlSpotify = entrada;
            if (!esLinkSpotify(entrada)) {
                const encontrado = await buscar(entrada);
                if (!encontrado) {
                    await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
                    return sock.sendMessage(chat, {
                        text: `˚₊· ͟͟͞͞➳❥ *SPOTIFY PLAY*\n───────────────\n✿ No encontré resultados para: *${entrada}*\n───────────────\n> AKAME-MD 🌸`
                    }, { quoted: msg });
                }
                urlSpotify = encontrado.url;
            }

            const info = await pedirAudio(urlSpotify);

            // La tarjeta con la portada y el audio se piden a la vez para ganar tiempo
            const [mp3, portada] = await Promise.all([
                bajarMp3(info.dl),
                info.cover
                    ? axios.get(info.cover, { responseType: 'arraybuffer', timeout: 15000, headers: UA })
                        .then((r) => Buffer.from(r.data)).catch(() => null)
                    : Promise.resolve(null)
            ]);

            if (portada) {
                await sock.sendMessage(chat, { image: portada, caption: tarjeta(info) }, { quoted: msg });
            } else {
                await sock.sendMessage(chat, { text: tarjeta(info) }, { quoted: msg });
            }

            await sock.sendMessage(chat, {
                audio: mp3,
                mimetype: 'audio/mpeg',
                fileName: `${info.artist || 'Spotify'} - ${info.title || 'audio'}.mp3`
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => {});
        } catch (e: any) {
            console.log('[SPLAY ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
            await sock.sendMessage(chat, {
                text: `˚₊· ͟͟͞͞➳❥ *SPOTIFY PLAY*\n───────────────\n✿ No pude enviar esa canción.\n✦ Prueba con otro nombre.\n───────────────\n> AKAME-MD 🌸`
            }, { quoted: msg });
        }
    }
};
