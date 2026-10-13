import { sendReactionMedia } from '#nsfw';

export default {
    command: ['cum'],
    description: 'Reacción 18+: cum',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'cum', 'Cum 🔞')
};
