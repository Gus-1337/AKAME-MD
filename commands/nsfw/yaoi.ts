import { sendReactionMedia } from '#nsfw';

export default {
    command: ['yaoi', 'yaoinsfw'],
    description: 'Reacción 18+: yaoi',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'yaoi', 'Yaoi 🔞')
};
