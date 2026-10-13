import { sendReactionMedia } from '#nsfw';

export default {
    command: ['anal'],
    description: 'Reacción 18+: anal',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'anal', 'Anal 🔞')
};
