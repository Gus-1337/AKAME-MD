import { delineJson, delineBytes } from '../../lib/deline.ts';

export default {
    command: ['parejas'],
    description: 'Envía fotos de perfil de pareja',
    category: 'fun',
    run: async (ctx: any) => {
        const { sock, msg, chat } = ctx;
        try {
            await sock.sendMessage(chat, { react: { text: '💞', key: msg.key } }).catch(() => null);
            const data = await delineJson('/random/ppcouple');
            const cowo = data?.result?.cowo;
            const cewe = data?.result?.cewe;
            if (!data?.status || !cowo || !cewe) throw new Error('sin imágenes');

            await sock.sendMessage(chat, {
                image: { url: cowo },
                caption: '╭─────────────────╮\n   💞 *PAREJA* 💞\n╰─────────────────╯\n\n❖ Él\n⋆ AKAME-MD ⋆'
            }, { quoted: msg });
            await sock.sendMessage(chat, {
                image: { url: cewe },
                caption: '❖ Ella\n⋆ AKAME-MD ⋆'
            }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No pude traer las fotos, intenta de nuevo.' }, { quoted: msg });
        }
    }
};
