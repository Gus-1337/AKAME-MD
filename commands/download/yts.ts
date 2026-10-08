import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import fetch from 'node-fetch';

export default {
    command: ['yts', 'ytsearch'],
    category: 'download',
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix, jid } = ctx;
        const targetJid = jid || chat;
        const q = args.join(' ').trim();
        if (!q) return sock.sendMessage(chat, { text: `Usa: ${usedPrefix}yts Anuel AA` }, { quoted: msg });

        try {
            const apikey = 'nyx_aOtu2zWUS5jfVwzbtmiDBZAfPZ_xeMTX';
            let res = await fetch(`https://nyxdlapi.vercel.app/api/search/youtube?apikey=${apikey}&q=${encodeURIComponent(q)}`).then(r => r.json());
            if (!res?.result?.results?.length) {
                res = await fetch(`https://nyxdlapi.vercel.app/api/search/youtube?apikey=${apikey}&query=${encodeURIComponent(q)}`).then(r => r.json());
            }

            const results = res.result.results.slice(0, 5);
            if (!results.length) return sock.sendMessage(chat, { text: `❌ No hay resultados` }, { quoted: msg });

            // SIN LINKS - solo info
            let txt = `🔍 *${res.result.query || q}* - ${results.length} resultados\n────────────────\n\n`;
            results.forEach((v, i) => {
                txt += `*${i + 1}. ${v.title}*\n`;
                txt += `✧ ${v.channel} | ${v.duration}\n\n`;
            });

            const media = await prepareWAMessageMedia({ image: { url: results[0].thumbnail } }, { upload: sock.waUploadToServer });

            const rows_mp3 = [];
            const rows_mp4 = [];

            results.forEach((v, i) => {
                rows_mp3.push({
                    title: `${i+1}. ${v.title.slice(0, 36)}`,
                    description: `${v.channel} | ${v.duration}`,
                    id: `${usedPrefix}ytmp3 ${v.url}`
                });
                rows_mp4.push({
                    title: `${i+1}. ${v.title.slice(0, 36)}`,
                    description: `${v.channel} | ${v.duration}`,
                    id: `${usedPrefix}ytmp4 ${v.url}`
                });
            });

            const list = generateWAMessageFromContent(targetJid, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: txt },
                            footer: { text: 'AKAME - Selecciona formato' },
                            header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
                            nativeFlowMessage: {
                                buttons: [
                                    {
                                        name: 'single_select',
                                        buttonParamsJson: JSON.stringify({
                                            title: '📥 Seleccionar formato',
                                            sections: [
                                                { title: '🎵 AUDIO MP3', highlight_label: 'MP3', rows: rows_mp3 },
                                                { title: '🎬 VIDEO MP4', highlight_label: 'MP4', rows: rows_mp4 }
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
            console.log(e);
            await sock.sendMessage(chat, { text: `❌ Error: ${e.message}` }, { quoted: msg });
        }
    }
};
