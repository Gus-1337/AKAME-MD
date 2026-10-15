// Comandos de imágenes de animales (API sin clave). Cada comando pide una imagen aleatoria y la envía.
const BASE = 'https://api.some-random-api.com/img';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

export const animalMaker = (opts: { command: string[]; description: string; tipo: string; titulo: string; emoji: string }) => ({
    command: opts.command,
    description: opts.description,
    category: 'fun',
    run: async ({ chat, m, sock }: any) => {
        try {
            const res = await fetch(`${BASE}/${opts.tipo}`, {
                headers: { 'User-Agent': UA, Accept: 'application/json' },
                signal: AbortSignal.timeout(20000)
            });
            const data: any = await res.json().catch(() => null);
            const link: string | undefined = data?.link;
            if (!res.ok || !link) throw new Error(`HTTP ${res.status}`);

            const img = await fetch(link, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
            if (!img.ok) throw new Error(`Imagen HTTP ${img.status}`);
            const buffer = Buffer.from(await img.arrayBuffer());

            return sock.sendMessage(chat, {
                image: buffer,
                caption: `˚₊· ͟͟͞͞➳❥ *${opts.titulo}* ${opts.emoji}\n───────────────\n> Imagen aleatoria 🌸`
            }, { quoted: m });
        } catch (e: any) {
            return sock.sendMessage(chat, { text: `✿ No pude traer la imagen, reintenta.\n> ${e.message}` }, { quoted: m });
        }
    }
});
