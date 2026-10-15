import axios from 'axios';
import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';

const DELIRIUS = ((global as any).APIs?.delirius?.url || 'https://api.delirius.online').replace(/\/+$/, '');

const esPinterest = (url: string) => /^https?:\/\/(www\.|[a-z]{2}\.)?(pinterest\.[a-z.]+|pin\.it)\//i.test(url);
const esLink = (texto: string) => /^https?:\/\//i.test(texto);

/** Busca un pin con video por nombre y devuelve su link de pin. */
async function buscarPin(query: string): Promise<string | null> {
    const { data } = await axios.get(`${DELIRIUS}/search/pinterestvideo`, {
        params: { query },
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const id = data?.data?.id;
    return id ? `https://www.pinterest.com/pin/${id}/` : null;
}

/** Descarga el MP4 y cambia el audio a AAC-LC para que WhatsApp lo reproduzca. Si ffmpeg falla, devuelve el original. */
async function arreglarVideo(url: string): Promise<Buffer> {
    const original = Buffer.from((await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 })).data);
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
        console.log('[PINVID] ffmpeg falló, se envía el original:', e.message);
        return original;
    } finally {
        for (const f of [tmpIn, tmpOut]) { try { fs.unlinkSync(f); } catch {} }
    }
}

/** Saca el video MP4 y los datos de un pin. */
async function obtenerVideo(pinUrl: string) {
    const { data } = await axios.get(`${DELIRIUS}/download/pinterestdl`, {
        params: { url: pinUrl },
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    return { ok: !!data?.status, pin: data?.data, media: data?.data?.download };
}

export default {
    command: ['pinvid'],
    category: 'download',
    description: 'Descarga un video de Pinterest por link o por nombre',
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
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

            let pinUrl = entrada;
            if (!esLink(entrada)) {
                pinUrl = await buscarPin(entrada);
                if (!pinUrl) {
                    await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
                    return sock.sendMessage(chat, {
                        text: `☬ *AKAME-MD* ☬\n\n♡ No encontré videos de Pinterest para: *${entrada}*`
                    }, { quoted: msg });
                }
            }

            const { ok, pin, media } = await obtenerVideo(pinUrl);
            if (!ok || !media?.url) throw new Error('No encontré el pin');

            if (media.type !== 'video') {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
                return sock.sendMessage(chat, {
                    text: `☬ *AKAME-MD* ☬\n\n♡ Ese pin no tiene video, solo imagen.`
                }, { quoted: msg });
            }

            const video = await arreglarVideo(media.url);

            await sock.sendMessage(chat, {
                video,
                mimetype: 'video/mp4',
                caption: `☬ *PINTEREST VIDEO* ☬\n\n♡ *Título:* ${pin.title || 'Sin título'}\n♡ *Autor:* ${pin.author_name || pin.username || 'Desconocido'}\n\n☬ *AKAME-MD* ♡`
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => {});
        } catch (e) {
            console.log('[PINVID ERROR]', e.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
            await sock.sendMessage(chat, {
                text: `☬ *AKAME-MD* ☬\n\n♡ No pude descargar ese video. Prueba con otro link o nombre.`
            }, { quoted: msg });
        }
    }
};
