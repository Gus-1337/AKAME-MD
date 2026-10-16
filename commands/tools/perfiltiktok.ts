import { delineJson } from '../../lib/deline.ts';

const nf = (n: number) => Number(n || 0).toLocaleString('es-PE');

export default {
    command: ['perfiltiktok'],
    description: 'Muestra el perfil de un usuario de TikTok',
    category: 'tools',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const usuario = (args || []).join('').replace(/^@/, '').trim();
        if (!usuario) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}perfiltiktok <usuario>*\n✦ Ejemplo: *${p}perfiltiktok khaby.lame*` }, { quoted: msg });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🔎', key: msg.key } }).catch(() => null);
            const data = await delineJson('/stalker/ttstalk', { username: usuario });
            const u = data?.result?.user;
            const s = data?.result?.stats || {};
            if (!data?.status || !u) throw new Error('sin perfil');

            const texto =
                '╭─────────────────╮\n' +
                '   ✧ *TIKTOK PERFIL* ✧\n' +
                '╰─────────────────╯\n\n' +
                `❖ *Nombre:* ${u.nickname || '—'}\n` +
                `✦ *Usuario:* @${u.uniqueId}\n` +
                `✦ *Seguidores:* ${nf(s.followerCount)}\n` +
                `✦ *Siguiendo:* ${nf(s.followingCount)}\n` +
                `✦ *Videos:* ${nf(s.videoCount)}\n` +
                `✦ *Verificado:* ${u.verified ? 'Sí ✔' : 'No'}\n` +
                `✦ *Privado:* ${u.privateAccount ? 'Sí' : 'No'}\n` +
                (u.signature ? `\n_${String(u.signature).slice(0, 200)}_\n` : '') +
                '\n⋆ AKAME-MD ⋆';

            const foto = u.avatarLarger || u.avatarMedium;
            await sock.sendMessage(chat, { image: { url: foto }, caption: texto }, { quoted: msg })
                .catch(() => sock.sendMessage(chat, { text: texto }, { quoted: msg }));
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: '✧ No encontré ese perfil de TikTok.' }, { quoted: msg });
        }
    }
};
