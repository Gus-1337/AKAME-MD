import { sendNsfwMedia } from '#nsfw';

export default {
    command: ['nsfwtiktok', 'nstiktok', 'nsfvideo'],
    description: 'Video NSFW aleatorio (videos estilo TikTok)',
    category: 'nsfw',
    nsfw: true,
    group: false,

    run: async (ctx: any) => sendNsfwMedia(ctx, 'tiktok', 'TikTok 🔞')
};
