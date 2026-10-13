import { sendReactionMedia } from '#nsfw';

export default {
    command: ['solo', 'solonsfw'],
    description: 'Reacción 18+: solo',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'solo', 'Solo 🔞')
};
