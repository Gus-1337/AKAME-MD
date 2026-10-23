import yts from 'yt-search';
import axios from 'axios';
import { getAudio } from './play.ts';
import { generarPortadaPlaylist } from '../../lib/portada-playlist.ts';

// Una playlist son 5 canciones: se buscan en YouTube y se bajan todas a la vez.
const CANCIONES = 5;
const MAX_SEGUNDOS = 15 * 60;

const limpiarNombre = (t: string) =>
    (String(t || 'audio')).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'audio';

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

const bajarMiniatura = async (url: string): Promise<Buffer | null> => {
    if (!url) return null;
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0' } });
        return Buffer.from(res.data);
    } catch {
        return null;
    }
};

export default {
    command: ['playlist', 'pl'],
    description: 'Busca un tema y te manda 5 canciones en MP3',
    category: 'download',
    group: true,

    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const reaccionar = (emoji: string) => sock.sendMessage(chat, { react: { text: emoji, key: msg.key } }).catch(() => null);
        const responder = (texto: string) => sock.sendMessage(chat, { text: texto }, { quoted: msg });
        const q = (args || []).join(' ').trim();

        if (!q) {
            return responder(caja('PLAYLIST', [
                `✧ Usa *${usedPrefix}playlist <tema o artista>*`,
                `✦ Ejemplo: *${usedPrefix}playlist rock en español*`
            ]));
        }

        await reaccionar('⏳');
        try {
            // 1. Buscar: solo canciones normales (fuera mixes, directos y videos de más de 15 min)
            const busqueda = await yts(q);
            const vistos = new Set<string>();
            const videos = (busqueda.videos || []).filter((v: any) => {
                const seg = Number(v?.seconds) || 0;
                if (!v?.videoId || vistos.has(v.videoId)) return false;
                if (v.type && v.type !== 'video') return false;
                if (seg < 30 || seg > MAX_SEGUNDOS) return false;
                if (/\bmix\b|playlist|directo|live/i.test(v.title || '')) return false;
                vistos.add(v.videoId);
                return true;
            }).slice(0, CANCIONES);

            if (!videos.length) {
                await reaccionar('❌');
                return responder(caja('PLAYLIST', [`✧ No encontré canciones para: *${q}*`]));
            }

            // 2. Empezar a bajar TODAS ya, y mientras tanto armar la portada
            const descargas = videos.map((v: any) =>
                getAudio(`https://youtu.be/${v.videoId}`).then((buf) => ({ ok: true as const, buf }), () => ({ ok: false as const, buf: null }))
            );
            const miniatura = await bajarMiniatura(videos[0].thumbnail || videos[0].image || '');

            // 3. Portada: la miniatura del primer resultado con las canciones
            const titulos = videos.map((v: any) => v.title);
            const caption = `> ✧ Tema » *${q}*\n> ✦ ${videos.length} canciones · MP3 como documento`;
            try {
                const portada = await generarPortadaPlaylist({ tema: q, canciones: titulos, miniatura });
                await sock.sendMessage(chat, { image: portada, caption }, { quoted: msg });
            } catch (err: any) {
                console.error('[PLAYLIST] portada falló:', err?.message);
                await responder(caja('PLAYLIST', [`✧ Tema » *${q}*`, '', ...titulos.map((t: string, i: number) => `✧ ${i + 1}. ${t}`)]));
            }

            // 4. Mandar cada canción en cuanto termina de bajar, en orden, como documento MP3
            let enviadas = 0;
            for (let i = 0; i < videos.length; i++) {
                const r = await descargas[i];
                if (!r.ok || !r.buf) continue;
                const titulo = limpiarNombre(videos[i].title);
                await sock.sendMessage(chat, {
                    document: r.buf,
                    mimetype: 'audio/mpeg',
                    fileName: `${titulo}.mp3`
                }, { quoted: msg });
                enviadas++;
            }

            await reaccionar(enviadas ? '✅' : '❌');
        } catch (e: any) {
            console.log('[PLAYLIST ERROR]', e?.message);
            await reaccionar('❌');
            await responder(caja('PLAYLIST', ['✧ No pude armar la playlist.', '✦ Prueba con otro tema.']));
        }
    }
};
