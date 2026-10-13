import { sendReactionMedia } from '#nsfw';

export default {
    command: ['poke', 'poking', 'codear'],
    description: 'Reacción anime: codear (poke)',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'poke', 'Poke 👉')
};
