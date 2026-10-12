import { sendNsfwMedia } from '#nsfw';

export default {
    command: ['boobs', 'tetas', 'nsfwboobs'],
    description: 'Imagen NSFW aleatoria de boobs',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendNsfwMedia(ctx, 'boobs', 'Boobs 🔞')
};
