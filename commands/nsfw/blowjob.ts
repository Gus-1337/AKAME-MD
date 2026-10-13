import { sendReactionMedia } from '#nsfw';

export default {
    command: ['blowjob', 'mamelada'],
    description: 'Reacción 18+: blowjob',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'blowjob', 'Blowjob 🔞')
};
