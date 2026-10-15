import axios from 'axios';

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

            await sock.sendMessage(chat, {
                video: { url: media.url },
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
