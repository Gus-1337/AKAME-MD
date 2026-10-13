import { sendReactionMedia } from '#nsfw';

export default {
    command: ['pussylick'],
    description: 'Reacción 18+: pussylick',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'pussylick', 'Pussylick 🔞')
};
