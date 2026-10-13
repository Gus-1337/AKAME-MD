import { sendReactionMedia } from '#nsfw';

export default {
    command: ['yuri', 'yurinsfw'],
    description: 'Reacción 18+: yuri',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'yuri', 'Yuri 🔞')
};
