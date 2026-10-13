import axios from 'axios';

const NYX_KEY = process.env.NYX_KEY || 'nyx_2rmMAKqdXlIkD9YLhMf29fU25Jo8rK1C';

export default {
    command: ['voz', 'hablar'],
    description: 'Convierte texto a voz (audio)',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        // Uso: .voz <texto>  |  .voz en <texto> (código de idioma opcional al inicio)
        let partes = [...args];
        let lang = 'es';
        if (partes.length > 1 && /^[a-z]{2}(-[a-z]{2})?$/i.test(partes[0])) {
            lang = partes.shift().toLowerCase();
        }
        const texto = partes.join(' ').trim();
        if (!texto) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.voz <texto>*\nEjemplo: *.voz hola amigo*\nCon idioma: *.voz en hello friend*' }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🔊', key: m.key } });
            const { data } = await axios.get('https://nyxdlapi.vercel.app/api/tools/tts', {
                params: { text: texto, lang, apikey: NYX_KEY },
                timeout: 30000
            });
            const audioUrl = data?.result?.audio;
            if (!data?.status || typeof audioUrl !== 'string') throw new Error(data?.message || 'sin audio');

            const res = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            await sock.sendMessage(chat, {
                audio: Buffer.from(res.data),
                mimetype: 'audio/mpeg',
                fileName: 'voz.mp3',
                ptt: false
            }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: `✿ No pude generar el audio: ${e?.message || 'error'}` }, { quoted: m });
        }
    }
};
