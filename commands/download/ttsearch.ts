import axios from 'axios';

export default {
    command: ['ttsearch', 'tiktoksearch', 'tts'],
    category: 'download',
    group: true,
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        const query = args.join(" ").trim();
        if (!query) return sock.sendMessage(chat, { text: `✿ Ingresa búsqueda ej: .tts gatos` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: "🔍", key: msg.key } });

            const apiUrl = `https://api-faa.my.id/faa/tiktok-search?q=${encodeURIComponent(query)}`;
            const { data } = await axios.get(apiUrl, { timeout: 15000 });

            // TU API DEVUELVE ASI
            const lista = data.resultado || data.result || [];
            if (!lista.length) throw new Error("sin resultados");

            const video = lista[Math.floor(Math.random() * Math.min(lista.length, 5))]; // random entre top 5

            const videoUrl = video.url_nowm || video.url_wm;
            if (!videoUrl) throw new Error("sin url");

            const titulo = video.título || video.title || "video tiktok";
            const autor = video.autor?.['nombre de usuario'] || video.autor?.username || "desconocido";
            const vistas = video.estadísticas?.vistas || video.estadisticas?.vistas || "??";

            await sock.sendMessage(chat, {
                image: { url: video.cover },
                caption: `*${titulo}*\n\n✿ Autor: @${autor}\n✿ Vistas: ${vistas}\n\n_Enviando..._`
            }, { quoted: msg });

            const res = await axios.get(videoUrl, {
                responseType: 'arraybuffer',
                timeout: 25000,
                headers: { 
                    'User-Agent': 'Mozilla/5.0',
                    'Referer': 'https://www.tiktok.com/'
                }
            });

            await sock.sendMessage(chat, {
                video: Buffer.from(res.data),
                mimetype: 'video/mp4',
                caption: `✿ ${titulo} - @${autor}`
            }, { quoted: msg });

            await sock.sendMessage(chat, { react: { text: "✅", key: msg.key } });

        } catch (e) {
            console.log('[TT ERROR]', e.message, e.response?.data);
            await sock.sendMessage(chat, { react: { text: "❌", key: msg.key } });
            await sock.sendMessage(chat, { text: `❌ Error: ${e.message}` }, { quoted: msg });
        }
    }
};
