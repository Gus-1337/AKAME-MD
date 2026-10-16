import axios from 'axios';

const POPCAT = ((global as any).APIs?.popcat?.url || 'https://api.popcat.xyz/v2').replace(/\/+$/, '');

const limpio = (v: any) => {
    const t = String(v ?? '').trim();
    return t && t !== 'N/A' ? t : null;
};

export default {
    command: ['pelicula', 'peli', 'imdb'],
    description: 'Busca información de una película',
    category: 'tools',
    run: async ({ chat, m, sock, args, usedPrefix }: any) => {
        const q = (args || []).join(' ').trim();
        const p = usedPrefix || '.';
        if (!q) {
            return sock.sendMessage(chat, {
                text: `✿ Usa: *${p}pelicula <nombre>*\n✿ Ejemplo: *${p}pelicula iron man*`
            }, { quoted: m });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '🎬', key: m.key } }).catch(() => null);
            const { data } = await axios.get(`${POPCAT}/imdb`, {
                params: { q },
                timeout: 20000
            });
            const info = data?.error ? null : data?.message;
            if (!info || !info.title) throw new Error('sin resultados');

            const rating = (info.ratings || []).find((r: any) => r.source === 'Internet Movie Database')?.value
                || (limpio(info.rating) ? `${info.rating}/10` : null);

            const lineas = [
                `🎬 *${info.title}*${limpio(info.year) ? ` (${info.year})` : ''}`,
                '',
                limpio(info.genres) && `✧ *Género:* ${info.genres}`,
                limpio(info.runtime) && `✧ *Duración:* ${info.runtime}`,
                limpio(info.rated) && `✧ *Clasificación:* ${info.rated}`,
                limpio(info.director) && `✧ *Director:* ${info.director}`,
                limpio(info.actors) && `✧ *Actores:* ${info.actors}`,
                rating && `✧ *IMDb:* ${rating}`,
                limpio(info.country) && `✧ *País:* ${info.country}`,
                limpio(info.boxoffice) && `✧ *Taquilla:* ${info.boxoffice}`,
                limpio(info.plot) && `\n📖 ${info.plot}`,
                limpio(info.imdburl) && `\n🔗 ${info.imdburl}`,
                '',
                '> AKAME-MD 🌸'
            ].filter((l) => l !== null && l !== false && l !== undefined).join('\n');

            const poster = limpio(info.poster);
            if (poster) {
                try {
                    await sock.sendMessage(chat, { image: { url: poster }, caption: lineas }, { quoted: m });
                } catch {
                    await sock.sendMessage(chat, { text: lineas }, { quoted: m });
                }
            } else {
                await sock.sendMessage(chat, { text: lineas }, { quoted: m });
            }
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } }).catch(() => null);
            return sock.sendMessage(chat, {
                text: `✿ No encontré esa película. Prueba con otro nombre.\n✿ Ejemplo: *${p}pelicula iron man*`
            }, { quoted: m });
        }
    }
};
