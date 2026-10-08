import axios from 'axios';
import config from '#config';

const getBuffer = async (url: string, timeoutMs = 30000): Promise<Buffer> => {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: timeoutMs,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        return Buffer.from(res.data);
    } catch {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return Buffer.from(await res.arrayBuffer());
    }
};

const getInstagramData = async (url: string) => {
    try {
        const endpoint = `https://api.delirius.online/download/instagramv2?url=${encodeURIComponent(url)}`;
        const res = await axios.get(endpoint, { timeout: 20000 });
        if (res.data?.status && res.data?.data) return { success: true, data: res.data.data };
        return { success: false };
    } catch { return { success: false }; }
};

const getInstagramDataFallback = async (url: string) => {
    try {
        const endpoint = `https://api.delirius.online/download/instagram?url=${encodeURIComponent(url)}`;
        const res = await axios.get(endpoint, { timeout: 20000 });
        if (res.data?.status && res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
            return { success: true, data: res.data.data };
        }
        return { success: false };
    } catch { return { success: false }; }
};

export default {
    command: ['instagram', 'ig', 'igdl'],
    description: 'Descarga contenido de Instagram',
    category: 'download',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix }: any) => {
        const msgId = m?.id || m?.key?.id;
        try {
            const url = args.join(' ').trim();
            if (!url) return sock.sendMessage(chat, { text: `✿ Ingresa un enlace de Instagram.` }, { quoted: m });

            let result = await getInstagramData(url);
            if (!result.success) result = await getInstagramDataFallback(url);
            if (!result.success) return sock.sendMessage(chat, { text: `✿ No se pudo obtener el contenido.` }, { quoted: m });

            let mediaItems = [];
            const data = result.data;

            if (data.download && Array.isArray(data.download)) {
                for (const item of data.download) {
                    if (item?.url) {
                        try {
                            const buffer = await getBuffer(item.url, 30000);
                            mediaItems.push({ type: item.type || 'image', buffer });
                        } catch {}
                    }
                }
            } else if (Array.isArray(data)) {
                for (const item of data) {
                    if (item?.url) {
                        try {
                            const buffer = await getBuffer(item.url, 30000);
                            mediaItems.push({ type: item.type || 'image', buffer });
                        } catch {}
                    }
                }
            }

            if (mediaItems.length === 0) return sock.sendMessage(chat, { text: `✿ No se pudo descargar.` }, { quoted: m });

            const captionSimple = `❀ Aquí tienes ლ^•.•^ლ.`;

            for (const media of mediaItems) {
                if (media.type === 'video') {
                    await sock.sendMessage(chat, { video: media.buffer, caption: captionSimple }, { quoted: m });
                } else {
                    await sock.sendMessage(chat, { image: media.buffer, caption: captionSimple }, { quoted: m });
                }
            }
        } catch (error: any) {
            return sock.sendMessage(chat, { text: `✿ Ocurrió un error.` }, { quoted: m });
        }
    }
};
