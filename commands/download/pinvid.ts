import axios from 'axios';
import { generateWAMessageFromContent, generateWAMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import crypto from 'crypto';
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { stellarUrl } from '../../lib/stellar.ts';

const DELIRIUS = ((global as any).APIs?.delirius?.url || 'https://api.delirius.online').replace(/\/+$/, '');

const CANTIDAD = 5;                  // videos por búsqueda (álbum)
const MAX_BYTES = 45 * 1024 * 1024;  // descarta videos muy pesados
const TIMEOUT_BUSQUEDA = 15000;
const UA = { 'User-Agent': 'Mozilla/5.0' };

const esPinterest = (url: string) => /^https?:\/\/(www\.|[a-z]{2}\.)?(pinterest\.[a-z.]+|pin\.it)\//i.test(url);
const esLink = (texto: string) => /^https?:\/\//i.test(texto);

type Hallazgo = { url: string; hls: boolean; titulo: string };

// Búsquedas recientes: si alguien pide lo mismo, sale al instante (15 min)
const CACHE_TTL = 15 * 60 * 1000;
const CACHE_MAX = 50;
const cache = new Map<string, { t: number; valor: Hallazgo[] }>();

/** Busca videos por nombre. Stellar trae varios MP4 directos; Delirius, si Stellar falla, trae uno (HLS). */
async function buscarVideos(query: string): Promise<Hallazgo[]> {
    const clave = query.trim().toLowerCase();
    const previo = cache.get(clave);
    if (previo && Date.now() - previo.t < CACHE_TTL) return previo.valor;

    let lista: Hallazgo[] = [];
    try {
        const { data } = await axios.get(stellarUrl('/search/pinterestvideo', { query }), {
            timeout: TIMEOUT_BUSQUEDA, headers: UA
        });
        lista = (data?.data?.videos || [])
            .filter((v: any) => typeof v?.dl === 'string' && v.dl.startsWith('http'))
            .map((v: any) => ({ url: v.dl, hls: false, titulo: String(v.title || '').trim() }));
    } catch {
        // sigue con el respaldo
    }

    if (!lista.length) {
        try {
            const { data } = await axios.get(`${DELIRIUS}/search/pinterestvideo`, {
                params: { query }, timeout: TIMEOUT_BUSQUEDA, headers: UA
            });
            const pin = data?.data;
            if (data?.status && pin) {
                if (pin.video) lista = [{ url: pin.video, hls: false, titulo: pin.title || '' }];
                else if (pin.m3u8) lista = [{ url: pin.m3u8, hls: true, titulo: pin.title || '' }];
            }
        } catch {
            // sin resultados
        }
    }

    if (lista.length) {
        if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
        cache.set(clave, { t: Date.now(), valor: lista });
    }
    return lista;
}

/** Convierte un HLS (m3u8) a MP4 con video H.264 y audio AAC-LC. */
async function hlsAMp4(m3u8: string): Promise<Buffer> {
    const id = randomBytes(6).toString('hex');
    const tmpOut = path.join(os.tmpdir(), `pinvid-${id}-hls.mp4`);
    try {
        await new Promise<void>((resolve, reject) => {
            execFile('ffmpeg', ['-y', '-v', 'error', '-i', m3u8, '-threads', '0', '-c:v', 'copy', '-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', '128k', '-ac', '2', '-movflags', '+faststart', tmpOut],
                { timeout: 180000 }, (err) => err ? reject(err) : resolve());
        });
        return fs.readFileSync(tmpOut);
    } finally {
        try { fs.unlinkSync(tmpOut); } catch {}
    }
}

/** Descarga el MP4 y cambia el audio a AAC-LC para que WhatsApp lo reproduzca. Si ffmpeg falla, devuelve el original. */
async function arreglarVideo(url: string): Promise<Buffer> {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000, maxContentLength: MAX_BYTES, maxBodyLength: MAX_BYTES, headers: UA });
    const original = Buffer.from(res.data);
    if (original.length < 10 * 1024) throw new Error('video vacío');
    const id = randomBytes(6).toString('hex');
    const tmpIn = path.join(os.tmpdir(), `pinvid-${id}-in.mp4`);
    const tmpOut = path.join(os.tmpdir(), `pinvid-${id}-out.mp4`);
    try {
        fs.writeFileSync(tmpIn, original);
        await new Promise<void>((resolve, reject) => {
            execFile('ffmpeg', ['-y', '-v', 'error', '-i', tmpIn, '-c:v', 'copy', '-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', '128k', '-ac', '2', '-movflags', '+faststart', tmpOut],
                { timeout: 120000 }, (err) => err ? reject(err) : resolve());
        });
        return fs.readFileSync(tmpOut);
    } catch (e) {
        console.log('[PINVID] ffmpeg falló, se envía el original:', (e as any)?.message);
        return original;
    } finally {
        for (const f of [tmpIn, tmpOut]) { try { fs.unlinkSync(f); } catch {} }
    }
}

/** Saca el video MP4 y los datos de un pin (por link). */
async function obtenerVideo(pinUrl: string) {
    const { data } = await axios.get(`${DELIRIUS}/download/pinterestdl`, {
        params: { url: pinUrl },
        timeout: 30000,
        headers: UA
    });
    return { ok: !!data?.status, pin: data?.data, media: data?.data?.download };
}

const tarjeta = (query: string, total: number) =>
`☬ *PINTEREST VIDEO* ☬

♡ *Búsqueda:* ${query}
♡ *Videos:* ${total}

☬ *AKAME-MD* ♡`;

export default {
    command: ['pinvid'],
    category: 'download',
    description: 'Descarga videos de Pinterest por link o envía 5 videos por nombre (álbum)',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix, jid } = ctx;
        const targetJid = jid || chat;
        const entrada = (args || []).join(' ').trim();

        if (!entrada) {
            return sock.sendMessage(chat, {
                text: `☬ *AKAME - PINVID* ☬\n\n♡ *Usa:*\n> ${usedPrefix}pinvid <link del pin>\n> ${usedPrefix}pinvid <nombre>\n\n♡ *Ejemplos:*\n> ${usedPrefix}pinvid https://pin.it/xxxxx\n> ${usedPrefix}pinvid gatos bailando`
            }, { quoted: msg });
        }

        if (esLink(entrada) && !esPinterest(entrada)) {
            return sock.sendMessage(chat, {
                text: `☬ *AKAME-MD* ☬\n\n♡ Ese link no es de Pinterest.`
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } }).catch(() => {});

            // Modo link: un solo pin
            if (esLink(entrada)) {
                const r = await obtenerVideo(entrada);
                if (!r.ok || !r.media?.url) throw new Error('No encontré el pin');
                if (r.media.type !== 'video') {
                    await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
                    return sock.sendMessage(chat, {
                        text: `☬ *AKAME-MD* ☬\n\n♡ Ese pin no tiene video, solo imagen.`
                    }, { quoted: msg });
                }
                const video = await arreglarVideo(r.media.url);
                await sock.sendMessage(chat, {
                    video,
                    mimetype: 'video/mp4',
                    caption: `☬ *PINTEREST VIDEO* ☬\n\n♡ *Título:* ${r.pin?.title || 'Sin título'}\n\n☬ *AKAME-MD* ♡`
                }, { quoted: msg });
                return sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => {});
            }

            // Modo nombre: hasta 5 videos en álbum
            const encontrados = await buscarVideos(entrada);
            if (!encontrados.length) {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
                return sock.sendMessage(chat, {
                    text: `☬ *AKAME-MD* ☬\n\n♡ No encontré videos de Pinterest para: *${entrada}*`
                }, { quoted: msg });
            }

            const candidatos = encontrados.slice(0, CANTIDAD);
            const resultados = await Promise.allSettled(candidatos.map((h) =>
                h.hls ? hlsAMp4(h.url) : arreglarVideo(h.url)
            ));
            const videos: Buffer[] = resultados
                .filter((r): r is PromiseFulfilledResult<Buffer> => r.status === 'fulfilled')
                .map((r) => r.value);

            if (!videos.length) throw new Error('no pude descargar ningún video');

            if (videos.length === 1) {
                await sock.sendMessage(chat, {
                    video: videos[0],
                    mimetype: 'video/mp4',
                    caption: tarjeta(entrada, 1)
                }, { quoted: msg });
                return sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => {});
            }

            // Álbum: abrir, subir los videos en paralelo y enviarlos asociados al álbum (igual que .tts)
            const opener = generateWAMessageFromContent(targetJid, {
                messageContextInfo: { messageSecret: crypto.randomBytes(32) },
                albumMessage: { expectedImageCount: 0, expectedVideoCount: videos.length }
            }, { userJid: jidNormalizedUser(sock.user.id), quoted: msg, upload: sock.waUploadToServer });

            await sock.relayMessage(targetJid, opener.message, { messageId: opener.key.id });

            const hijos = await Promise.all(videos.map((buffer, i) =>
                generateWAMessage(targetJid, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    caption: i === 0 ? tarjeta(entrada, videos.length) : `🎬 ${i + 1}/${videos.length}`
                }, { upload: sock.waUploadToServer })
            ));

            for (const child of hijos) {
                child.message.messageContextInfo = {
                    messageSecret: crypto.randomBytes(32),
                    messageAssociation: { associationType: 1, parentMessageKey: opener.key }
                };
                await sock.relayMessage(targetJid, child.message, { messageId: child.key.id });
            }

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => {});
        } catch (e) {
            console.log('[PINVID ERROR]', (e as any)?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
            await sock.sendMessage(chat, {
                text: `☬ *AKAME-MD* ☬\n\n♡ No pude descargar ese video. Prueba con otro link o nombre.`
            }, { quoted: msg });
        }
    }
};
