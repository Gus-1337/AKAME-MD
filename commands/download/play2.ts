import yts from 'yt-search';
import { getVideoBuffer } from '#ytdl';

const YT_REGEX = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/))([a-zA-Z0-9_-]{11})/;

const limpiarNombre = (t) => (String(t || 'video')).replace(/[\\\\/:*?\"<>|]/g, '').trim().slice(0, 80) || 'video';

export default {
    command: ['play2', 'mp4', 'playvid', 'playvideo'],
    description: 'Video directo',
    category: 'download',
    group: true,
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const query = args.join(' ').trim();

        if (!query) return sock.sendMessage(chat, { text: `🎬 Ingresa nombre o link\nEj: .play2 Bad Bunny` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: '🎬', key: msg.key } });

            // Link directo o búsqueda por nombre
            let videoId;
            const m = query.match(YT_REGEX);
            if (m) {
                videoId = m[1];
            } else {
                const search = await yts(query);
                const first = search?.videos?.[0];
                if (!first) throw new Error('sin resultados');
                videoId = first.videoId;
            }
            const videoUrl = `https://youtu.be/${videoId}`;

            // Datos para la tarjeta (si falla, seguimos sin ella)
            let info: any = null;
            try { info = await yts({ videoId }); } catch {}
            const titulo = limpiarNombre(info?.title);

            await sock.sendMessage(chat, {
                image: { url: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` },
                caption: `🎬 *${info?.title || 'Video'}*\n\n✿ Canal: ${info?.author?.name || 'Desconocido'}\n✿ Duración: ${info?.timestamp || '??'}\n✿ Vistas: ${info?.views?.toLocaleString?.() || '??'}\n\n_Descargando video..._`
            }, { quoted: msg }).catch(() => null);

            const buffer = await getVideoBuffer(videoUrl);
            const mb = (buffer.length / (1024 * 1024)).toFixed(1);

            if (buffer.length > 64 * 1024 * 1024) {
                // Muy pesado para video: como documento
                await sock.sendMessage(chat, {
                    document: buffer,
                    mimetype: 'video/mp4',
                    fileName: `${titulo}.mp4`,
                    caption: `🎬 ${titulo}\n✿ ${mb} MB - enviado como documento`
                }, { quoted: msg });
            } else {
                await sock.sendMessage(chat, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    fileName: `${titulo}.mp4`,
                    caption: `🎬 ${titulo}`
                }, { quoted: msg });
            }

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });
        } catch (e) {
            console.log('[PLAY2 ERROR]', e?.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: `❌ No pude descargar el video, intenta de nuevo` }, { quoted: msg });
        }
    }
};
