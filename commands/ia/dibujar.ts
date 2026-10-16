import axios from 'axios';

/**
 * Generación de imágenes con Pollinations (sin clave).
 * El plan gratis permite 1 imagen cada 45 s por IP, así que las peticiones
 * se ponen en cola y salen de una en una, con 46 s entre cada una.
 */
const INTERVALO = 46000;
const MAX_COLA = 10;
let ultimaSalida = 0;
let pendientes = 0;
let cadena: Promise<void> = Promise.resolve();

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generar(prompt: string): Promise<Buffer> {
    for (let intento = 0; intento < 3; intento++) {
        const desde = Date.now() - ultimaSalida;
        if (desde < INTERVALO) await esperar(INTERVALO - desde);
        ultimaSalida = Date.now();
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=768&height=768&nologo=true&model=flux`;
        try {
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 90000, headers: { 'User-Agent': 'Mozilla/5.0' }, validateStatus: () => true });
            if (res.status === 200 && String(res.headers['content-type'] || '').startsWith('image/')) return Buffer.from(res.data);
            if (res.status === 402) {
                // Límite: esperar lo que indique el mensaje y reintentar
                const txt = Buffer.from(res.data).toString();
                const seg = Number((txt.match(/Retry after (\d+)s/) || [])[1]) || 45;
                await esperar(seg * 1000 + 1000);
                continue;
            }
            throw new Error(`status ${res.status}`);
        } catch (e) {
            if (intento === 2) throw e;
        }
    }
    throw new Error('sin imagen');
}

export default {
    command: ['dibujar'],
    description: 'Genera una imagen con IA a partir de texto',
    category: 'ia',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const prompt = (args || []).join(' ').trim();
        if (!prompt) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}dibujar <descripción>*\n✦ Ejemplo: *${p}dibujar un gato astronauta en la luna*` }, { quoted: msg });
        }
        if (pendientes >= MAX_COLA) {
            return sock.sendMessage(chat, { text: '✧ Hay muchas imágenes en cola. Intenta de nuevo en unos minutos.' }, { quoted: msg });
        }

        const posicion = pendientes;
        pendientes++;
        const espera = Math.round((posicion * INTERVALO) / 1000);
        await sock.sendMessage(chat, { react: { text: '🎨', key: msg.key } }).catch(() => null);
        if (posicion > 0) {
            await sock.sendMessage(chat, { text: `✧ Estoy generando otras imágenes. Tu imagen está en el lugar ${posicion + 1}, espera unos ${espera} s.` }, { quoted: msg });
        }

        const tarea = cadena.then(async () => {
            try {
                const img = await generar(prompt.slice(0, 500));
                await sock.sendMessage(chat, {
                    image: img,
                    caption: `╭─────────────────╮\n   🎨 *IMAGEN IA* 🎨\n╰─────────────────╯\n\n❖ ${prompt.slice(0, 200)}\n\n⋆ AKAME-MD ⋆`
                }, { quoted: msg });
                await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
            } catch {
                await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
                await sock.sendMessage(chat, { text: '✧ No pude generar la imagen, intenta de nuevo en un momento.' }, { quoted: msg });
            } finally {
                pendientes--;
            }
        });
        cadena = tarea.catch(() => undefined);
        return tarea;
    }
};
