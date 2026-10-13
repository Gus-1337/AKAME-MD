import { randomNsfwEndpoint, sendNsfwMedia } from '#nsfw';

export default {
    command: ['nsfwrandom', 'horny'],
    description: 'Contenido NSFW al azar de toda la categoría',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendNsfwMedia(ctx, randomNsfwEndpoint(), 'Random 🔞')
};
