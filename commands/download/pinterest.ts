import axios from 'axios';
import { LRUCache } from 'lru-cache';

const usedImagesCache = new LRUCache({ max: 100, ttl: 3600000 });

const getBuffer = async (url) => {
    const res = await axios.get(url, { 
        responseType: 'arraybuffer', 
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000 
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
            let available = results.filter(i => i?.image && !usedSet.has(i.image));
            if (available.length < 5) { usedSet.clear(); available = results.filter(i => i?.image); }
            const selected = available.sort(() => 0.5 - Math.random()).slice(0, 5);
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

            const buffers = await Promise.all(selected.map(s => getBuffer(s.image)));

            // Contenido de las 5 imagenes - sin caption para que no se separe
            const contents = await Promise.all(buffers.map(buf => 
                generateWAMessageContent({ image: buf }, { upload: sock.waUploadToServer })
            ));

            // 1. Crear el mensaje base del álbum
            const album = generateWAMessageFromContent(chat, {
                albumMessage: { expectedImageCount: contents.length }
            }, { userJid: m.sender, quoted: m });

            await sock.relayMessage(chat, album.message, { messageId: album.key.id });

            // 2. Mandar las 5 de golpe citando al álbum - ESTO es lo que las agrupa
            const sendPromises = contents.map((content, i) => {
                if (i === 0) content.imageMessage.caption = `﹒𝜗ৎ ࣪ *${query}*\n✿ Total » 5`;
                const msg = generateWAMessageFromContent(chat, content, { 
                    userJid: m.sender,
                    quoted: album 
                });
                return sock.relayMessage(chat, msg.message, { messageId: msg.key.id });
            });

            await Promise.all(sendPromises);

        } catch (e) {
            console.error('Pinterest error:', e);
            await sock.sendMessage(chat, { text: ` ✿ Error: ${e.message}` }, { quoted: m });
        }
    }
};
