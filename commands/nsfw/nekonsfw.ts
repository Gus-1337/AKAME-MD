import { sendReactionMedia } from '#nsfw';

export default {
    command: ['nekonsfw', 'nekohentai'],
    description: 'Reacción 18+: neko hentai',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendReactionMedia(ctx, 'nekonsfw', 'Neko NSFW 🔞')
};
