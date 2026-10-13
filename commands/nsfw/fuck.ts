import { sendReactionMedia } from '#nsfw';

export default {
    command: ['fuck', 'follar'],
    description: 'Reacción 18+: fuck',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'fuck', 'Fuck 🔞')
};
