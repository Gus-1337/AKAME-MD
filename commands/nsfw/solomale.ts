import { sendReactionMedia } from '#nsfw';

export default {
    command: ['solomale', 'solohombre'],
    description: 'Reacción 18+: solo hombre',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'solo_male', 'Solo hombre 🔞')
};
