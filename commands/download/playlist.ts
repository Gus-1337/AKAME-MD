import yts from 'yt-search';
import { getAudio } from './play.ts';

// Una playlist son 5 canciones: se buscan en YouTube y se bajan todas a la vez.
const CANCIONES = 5;
const MAX_SEGUNDOS = 15 * 60;
const DOC_BYTES = 16 * 1024 * 1024; // por encima de esto se manda como documento

const limpiarNombre = (t: string) =>
    (String(t || 'audio')).replace(/[\\/:*?"<>|]/g, '').trim().slice(0, 80) || 'audio';

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

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
            // 1. Buscar: se toman 5 videos distintos
            const busqueda = await yts(q);
            const vistos = new Set<string>();
            // Solo canciones normales: fuera mixes, directos y videos de más de 15 min
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

            // 2. Bajar todas a la vez (cada una ya prueba varias APIs en paralelo)
            const resultados = await Promise.allSettled(
                videos.map((v: any) => getAudio(`https://youtu.be/${v.videoId}`))
            );

            // 3. Lista de lo que se va a mandar
            const lista = videos.map((v: any, i: number) => {
                const ok = resultados[i].status === 'fulfilled';
                return `${ok ? '✧' : '✦'} ${i + 1}. ${v.title} ${ok ? '' : '(no se pudo)'}`.trimEnd();
            });
            await responder(caja('PLAYLIST', [
                `✧ Tema » *${q}*`,
                `✦ Canciones » *${videos.length}*`,
                '',
                ...lista
            ]));

            // 4. Mandar los audios en orden
            let enviadas = 0;
            for (let i = 0; i < videos.length; i++) {
                const r = resultados[i];
                if (r.status !== 'fulfilled') continue;
                const audio = r.value;
                const titulo = limpiarNombre(videos[i].title);
                if (audio.length > DOC_BYTES) {
                    await sock.sendMessage(chat, { document: audio, mimetype: 'audio/mpeg', fileName: `${titulo}.mp3` }, { quoted: msg });
                } else {
                    await sock.sendMessage(chat, { audio, mimetype: 'audio/mpeg', fileName: `${titulo}.mp3`, ptt: false }, { quoted: msg });
                }
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
