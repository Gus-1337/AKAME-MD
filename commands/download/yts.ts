import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import fetch from 'node-fetch';

export default {
    command: ['yts', 'ytsearch'],
    category: 'download',
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix, jid } = ctx;
        const targetJid = jid || chat;
        const q = args.join(' ').trim();
        if (!q) return sock.sendMessage(chat, { text: `✦ Usa: ${usedPrefix}yts Anuel AA` }, { quoted: msg });

        try {
            const apikey = 'nyx_aOtu2zWUS5jfVwzbtmiDBZAfPZ_xeMTX';

            // Una sola petición optimizada
            const apiUrl = `https://nyxdlapi.vercel.app/api/search/youtube?apikey=${apikey}&q=${encodeURIComponent(q)}`;
            let res = await fetch(apiUrl).then(r => r.json()).catch(() => null);

            // Fallback si falla la primera forma
            if (!res?.result?.results?.length) {
                res = await fetch(`https://nyxdlapi.vercel.app/api/search/youtube?apikey=${apikey}&query=${encodeURIComponent(q)}`).then(r => r.json());
            }

            const results = res?.result?.results?.slice(0, 10) || [];
            if (!results.length) return sock.sendMessage(chat, { text: `❌ No hay resultados para *${q}*` }, { quoted: msg });

            // DISEÑO BONITO + CON DURACIÓN
            let txt = ` ୨ ࣪ YouTube Search ࣪ ୧\n\n`;
            txt += ` ✿ Search ✿\n\n`;
            txt += ` ⊹ búsqueda » *${res.result.query || q}*\n`;
            txt += ` ⊹ resultados » *${results.length}*\n\n`;
            txt += `Elige el video y el formato a descargar`;

            const media = await prepareWAMessageMedia({ image: { url: results[0].thumbnail } }, { upload: sock.waUploadToServer });

            const rows_mp3 = [];
            const rows_mp4 = [];

            for (let i = 0; i < results.length; i++) {
                const v = results[i];
                const dur = v.duration || '0:00';
                const channel = v.channel || 'Desconocido';

                rows_mp3.push({
                    title: `${v.title.slice(0, 40)}`,
                    description: `${channel} • ${dur} • AUDIO`,
                    id: `${usedPrefix}ytmp3 ${v.url}`
                });
                rows_mp4.push({
                    title: `${v.title.slice(0, 40)}`,
                    description: `${channel} • ${dur} • VIDEO`,
                    id: `${usedPrefix}ytmp4 ${v.url}`
                });
            }

            const list = generateWAMessageFromContent(targetJid, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: txt },
                            footer: { text: 'AKAME MD • Elige una opción' },
                            header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: 'single_select',
                                        buttonParamsJson: JSON.stringify({
                                            title: '≡ Elegir resultado',
                                            sections: [
                                                { title: '🎵 AUDIO - YTMP3', highlight_label: 'MP3', rows: rows_mp3 },
                                                { title: '🎬 VIDEO - YTMP4', highlight_label: 'MP4', rows: rows_mp4 }
                                            ]
                                        })
                                    }
                                ]
                            }
                        }
                    }
                }
            }, { quoted: msg });

            await sock.relayMessage(targetJid, list.message, { messageId: list.key.id });

        } catch (e) {
            console.log('[YTS ERROR]', e);
            await sock.sendMessage(chat, { text: `❌ Error: ${e.message}` }, { quoted: msg });
        }
    }
};
