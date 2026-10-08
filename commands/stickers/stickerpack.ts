import config from '#config';
import axios from 'axios';
import sharp from 'sharp';

const api = (config as any).api || (global as any).api || { url: 'https://api.stellarwa.xyz', key: 'proyectsV2' };

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const toBuffer = async (url: string) => Buffer.from((await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 })).data);

const toWebp = async (buffer: Buffer, isAnimated = false) => {
  if (isAnimated) {
    return await sharp(buffer, { animated: true }).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 50, loop: 0 }).toBuffer();
  }
  let webp = await sharp(buffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 50 }).toBuffer();
  if (webp.length > 100 * 1024) {
    webp = await sharp(buffer).resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 40 }).toBuffer();
  }
  return webp;
};

export default {
  command: ['stickerpack', 'spack'],
  description: 'Descarga pack de sticker.ly',
  category: 'stickers',
  group: true,
  run: async (ctx: any) => {
    const { sock, msg, chat, args } = ctx;
    const text = args.join(" ").trim();
    if (!text) return sock.sendMessage(chat, { text: `《✧》 Ingresa un texto o URL de sticker.ly` }, { quoted: msg });

    try {
      const isUrl = /sticker\.ly\/s\//i.test(text);
      let packData: any;

      if (isUrl) {
        const { data } = await axios.get(`${api.url}/stickerly/detail`, { params: { url: text, key: api.key } });
        if (!data.status) throw new Error('Pack privado o no disponible');
        packData = data.detalles;
      } else {
        const { data } = await axios.get(`${api.url}/stickerly/search`, { params: { query: text, key: api.key } });
        if (!data.status || !data.resultados?.length) return sock.sendMessage(chat, { text: `《✧》 No hay packs para *${text}*` }, { quoted: msg });
        const random = data.resultados[Math.floor(Math.random() * Math.min(5, data.resultados.length))];
        const { data: detail } = await axios.get(`${api.url}/stickerly/detail`, { params: { url: random.url, key: api.key } });
        packData = detail.detalles;
      }

      const { name: packName, author, stickers, thumbnailUrl } = packData;
      const selected = stickers.slice(0, 30);

      const [cover, stickerResults] = await Promise.all([
        (async () => {
          try { return await sharp(await toBuffer(thumbnailUrl)).resize(96, 96).webp().toBuffer(); }
          catch { return await sharp({ create: { width: 96, height: 96, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }}).webp().toBuffer(); }
        })(),
        Promise.all(selected.map(async (s: any) => {
          try {
            const buf = await toBuffer(s.imageUrl);
            const sticker = await toWebp(buf, s.isAnimated);
            return { sticker, isAnimated: s.isAnimated || false, isLottie: false, emojis: ['🎭'] };
          } catch { return null; }
        })).then(r => r.filter(Boolean))
      ]);

      await sock.sendMessage(chat, {
        stickerPack: {
          name: packName,
          publisher: author?.name || 'AKAME-MD',
          description: 'AKAME-MD ♡',
          cover,
          stickers: stickerResults
        }
      }, { quoted: msg });

    } catch (e: any) {
      console.error(e);
      await sock.sendMessage(chat, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  }
};
