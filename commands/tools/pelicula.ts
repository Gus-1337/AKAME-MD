import axios from 'axios';

const POPCAT = ((global as any).APIs?.popcat?.url || 'https://api.popcat.xyz/v2').replace(/\/+$/, '');

const limpio = (v: any) => {
    const t = String(v ?? '').trim();
    return t && t !== 'N/A' ? t : null;
};

/** Traduce a español con Stellar. Si falla, devuelve el texto original. */
const aEspanol = async (texto: string | null): Promise<string | null> => {
    if (!texto) return null;
    try {
        const { data } = await axios.get('https://api.stellarwa.xyz/tools/translate', {
            params: { text: texto, to: 'es', key: 'proyectsV2' },
            timeout: 20000
        });
        const t = data?.status && data?.translated ? String(data.translated).trim() : '';
        return t || texto;
    } catch {
        return texto;
    }
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

            const [generos, sinopsis] = await Promise.all([
                aEspanol(limpio(info.genres)),
                aEspanol(limpio(info.plot))
            ]);

            const lineas = [
                `🎬 *${info.title}*${limpio(info.year) ? ` (${info.year})` : ''}`,
                '',
                generos && `✧ *Género:* ${generos}`,
                limpio(info.runtime) && `✧ *Duración:* ${info.runtime}`,
                limpio(info.rated) && `✧ *Clasificación:* ${info.rated}`,
                limpio(info.director) && `✧ *Director:* ${info.director}`,
                limpio(info.actors) && `✧ *Actores:* ${info.actors}`,
                rating && `✧ *IMDb:* ${rating}`,
                limpio(info.country) && `✧ *País:* ${info.country}`,
                limpio(info.boxoffice) && `✧ *Taquilla:* ${info.boxoffice}`,
                sinopsis && `\n📖 ${sinopsis}`,
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
