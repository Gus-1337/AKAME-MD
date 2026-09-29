import axios from 'axios';
import fetch from 'node-fetch';

const getBuffer = async (url, retries = 1) => {
    for (let i = 0; i <= retries; i++) {
        try {
            const { data } = await axios.get(url, {
                responseType: 'arraybuffer',
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 50000
            });
            return Buffer.from(data);
        } catch (e) {
            if (i === retries) throw e;
        }
    }
};

export default {
    command: ['tiktoksearch', 'ttsearch', 'tts'],
    category: 'download',
    group: true,
    run: async (ctx) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';

        let page = 1;
        let qRaw = args.join(' ').trim();
        if (qRaw.includes('--page')) {
            const parts = qRaw.split('--page');
            qRaw = parts[0].trim();
            page = parseInt(parts[1].trim()) || 1;
        }
        const q = qRaw;
        if (!q) return sock.sendMessage(chat, { text: `✿ Usa: ${p}ttsearch cubana` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: '🔍', key: msg.key } });

            const apikey = 'nyx_aOtu2zWUS5jfVwzbtmiDBZAfPZ_xeMTX';
            const api = `https://nyxdlapi.vercel.app/api/search/tiktoksearch?apikey=${apikey}&q=${encodeURIComponent(q)}`;
            const json = await fetch(api).then(r => r.json());
            const all = json?.result?.results;

            if (!all?.length) {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
                return sock.sendMessage(chat, { text: `✿ Nada para ${q}` }, { quoted: msg });
            }

            const perPage = 5;
            const slice = all.slice((page - 1) * perPage, page * perPage);
            if (!slice.length) return sock.sendMessage(chat, { text: `✿ No hay más` }, { quoted: msg });

            let genContent, genFromContent;
            try {
                const b = await import('baileys');
                genContent = b.generateWAMessageContent;
                genFromContent = b.generateWAMessageFromContent;
            } catch {
                const b = await import('@whiskeysockets/baileys');
                genContent = b.generateWAMessageContent;
                genFromContent = b.generateWAMessageFromContent;
            }

            // 1. DESCARGA EN PARALELO (más rápido)
            const buffers = await Promise.all(
                slice.map(v => getBuffer(`https://nyxdlapi.vercel.app${v.video}&apikey=${apikey}`))
            );

            // 2. SUBIDA EN PARALELO (más rápido)
            const uploaded = await Promise.all(
                buffers.map(async (buf) => {
                    const c = await genContent({ video: buf }, { upload: sock.waUploadToServer });
                    return c.videoMessage;
                })
            );

            await sock.sendMessage(chat, { react: { text: '📤', key: msg.key } });

            // 3. ÁLBUM OFICIAL - FORMA CORRECTA BAILEYS ANDRÉS
            const album = genFromContent(chat, {
                albumMessage: {
                    expectedImageCount: uploaded.length
                }
            }, { userJid: chat });

            await sock.relayMessage(chat, album.message, { messageId: album.key.id });

            for (const videoMessage of uploaded) {
                const m = genFromContent(chat, { videoMessage }, { userJid: chat, quoted: album });
                await sock.relayMessage(chat, m.message, { messageId: m.key.id });
            }

            // 4. BOTÓN SIGUIENTE
            if (all.length > page * perPage) {
                await sock.sendMessage(chat, {
                    text: `🔍 *${q}* | Pag ${page}`,
                    footer: 'Siguiente página',
                    interactiveButtons: [{
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: `Siguiente ▶️`,
                            id: `${p}ttsearch ${q} --page ${page + 1}`
                        })
                    }]
                }, { quoted: msg });
            }

            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });

        } catch (e) {
            console.error('[TTSEARCH ERROR]', e.message);
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, { text: `✿ Error: ${e.message}\nIntenta de nuevo` }, { quoted: msg });
        }
    }
};