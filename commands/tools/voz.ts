import axios from 'axios';

const YOSOYYO_URL = 'https://api-yosoyyo-api-ofc.onrender.com';
const YOSOYYO_KEY = process.env.YOSOYYO_KEY || 'Akame-proyet';
const MAX_CARACTERES = 500;

/** Valida que sean bytes de audio real (MP3/M4A/Ogg/WAV), no HTML ni JSON. */
const esAudio = (buf: Buffer) => {
    if (buf.length < 1024) return false;
    const head = buf.subarray(0, 32);
    const txt = head.toString('utf8', 0, 16).trimStart();
    if (txt.startsWith('<') || txt.startsWith('{')) return false;
    return head.subarray(0, 3).toString() === 'ID3'
        || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0)
        || head.indexOf('ftyp') !== -1
        || head.subarray(0, 4).toString() === 'OggS'
        || head.subarray(0, 4).toString() === 'RIFF';
};

export default {
    command: ['voz', 'hablar'],
    description: 'Convierte texto a voz (audio)',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        const texto = args.join(' ').trim();
        if (!texto) {
            return sock.sendMessage(chat, { text: '✿ Usa: *.voz <texto>*\nEjemplo: *.voz hola amigo*' }, { quoted: m });
        }
        if (texto.length > MAX_CARACTERES) {
            return sock.sendMessage(chat, { text: `✿ El texto es muy largo, máximo ${MAX_CARACTERES} caracteres.` }, { quoted: m });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🔊', key: m.key } });
            const { data } = await axios.get(`${YOSOYYO_URL}/api/tts`, {
                params: { text: texto, apiKey: YOSOYYO_KEY },
                responseType: 'arraybuffer',
                timeout: 45000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            const buffer = Buffer.from(data);
            if (!esAudio(buffer)) throw new Error('la API no devolvió audio');

            await sock.sendMessage(chat, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                fileName: 'voz.mp3',
                ptt: false
            }, { quoted: m });
            await sock.sendMessage(chat, { react: { text: '✅', key: m.key } });
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: m.key } });
            return sock.sendMessage(chat, { text: `✿ No pude generar el audio, intenta de nuevo` }, { quoted: m });
        }
    }
};
