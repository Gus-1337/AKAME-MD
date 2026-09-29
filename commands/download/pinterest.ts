import axios from 'axios';
import { LRUCache } from 'lru-cache';

const usedImagesCache = new LRUCache({ max: 100, ttl: 3600000 });

const getBuffer = async (url) => {
    const res = await axios.get(url, { 
        responseType: 'arraybuffer', 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 10000 
    });
    return Buffer.from(res.data);
};

export default {
    command: ['pinterest', 'pin'],
    description: 'Pinterest álbum',
    category: 'download',
    group: true,
    run: async ({ chat, m, sock, args }) => {
        try {
            const query = args.join(' ').trim();
            if (!query) return sock.sendMessage(chat, { text: ` ✿ Ingresa término` }, { quoted: m });

            const { data } = await axios.get(`https://api.delirius.online/search/pinterestv2?text=${encodeURIComponent(query)}`);
            const results = data?.data;
            if (!results?.length) return sock.sendMessage(chat, { text: ` ✿ Sin resultados` }, { quoted: m });

            const cacheKey = query.toLowerCase();
            if (!usedImagesCache.has(cacheKey)) usedImagesCache.set(cacheKey, new Set());
            const usedSet = usedImagesCache.get(cacheKey);
            let available = results.filter(i => i?.image &&!usedSet.has(i.image));
            if (available.length < 10) { usedSet.clear(); available = results.filter(i => i?.image); }
            const selected = available.sort(() => 0.5 - Math.random()).slice(0, 10);
            selected.forEach(s => usedSet.add(s.image));

            let generateWAMessageContent, generateWAMessageFromContent;
            try {
                const b = await import('baileys');
                generateWAMessageContent = b.generateWAMessageContent;
                generateWAMessageFromContent = b.generateWAMessageFromContent;
            } catch {
                const b = await import('@whiskeysockets/baileys');
                generateWAMessageContent = b.generateWAMessageContent;
                generateWAMessageFromContent = b.generateWAMessageFromContent;
            }

            // Subir las 10 en paralelo (más rápido)
            const medias = await Promise.all(selected.map(async (it, i) => {
                const buf = await getBuffer(it.image);
                const title = it.title && it.title!== '-'? it.title : query;
                const caption = i === 0? `﹒𝜗ৎ ࣪ *${title}*\n\nׅ ׄ ✿ *Búsqueda* » ${query}\nׅ ׄ ✿ *Total* » ${selected.length}\n\nׅ ׄ ✿ By *GUS*` : '';
                const content = await generateWAMessageContent({ image: buf, caption }, { upload: sock.waUploadToServer });
                return content;
            }));

            // 1. Crear mensaje álbum
            const album = generateWAMessageFromContent(chat, {
                albumMessage: { expectedImageCount: medias.length }
            }, { userJid: chat, quoted: m });

            await sock.relayMessage(chat, album.message, { messageId: album.key.id });

            // 2. Mandar las 10 imágenes respondiendo al álbum (así WA las agrupa)
            for (const media of medias) {
                const msg = generateWAMessageFromContent(chat, media, { 
                    userJid: chat, 
                    quoted: album 
                });
                await sock.relayMessage(chat, msg.message, { messageId: msg.key.id });
            }

        } catch (e) {
            console.error('Pinterest error:', e.message);
            await sock.sendMessage(chat, { text: ` ✿ Error en pinterest` }, { quoted: m });
        }
    }
};