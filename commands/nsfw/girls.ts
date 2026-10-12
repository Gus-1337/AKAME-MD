import { sendNsfwMedia } from '#nsfw';

export default {
    command: ['girls', 'chicas', 'nsfwgirls'],
    description: 'Imagen NSFW aleatoria de chicas',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendNsfwMedia(ctx, 'girls', 'Girls 🔞')
};
