import { sendNsfwMedia } from '#nsfw';

export default {
    command: ['corean', 'coreanas', 'nsfwcorean'],
    description: 'Imagen NSFW aleatoria de coreanas',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendNsfwMedia(ctx, 'corean', 'Corean 🔞')
};
