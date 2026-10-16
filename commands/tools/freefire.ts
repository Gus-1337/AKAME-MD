import { delineJson } from '../../lib/deline.ts';

export default {
    command: ['freefire'],
    description: 'Muestra la cuenta de Free Fire por su ID',
    category: 'tools',
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        const id = (args || [])[0] || '';
        if (!/^\d{5,20}$/.test(id)) {
            return sock.sendMessage(chat, { text: `✧ Usa: *${p}freefire <ID>*\n✦ Ejemplo: *${p}freefire 123456789*\n✦ El ID es el número de tu cuenta de Free Fire.` }, { quoted: msg });
        }
        try {
            await sock.sendMessage(chat, { react: { text: '🔎', key: msg.key } }).catch(() => null);
            const data = await delineJson('/stalker/stalkff', { id });
            if (!data?.status || !data?.result) throw new Error('sin cuenta');

            // Muestra los datos sencillos que devuelve la cuenta
            const r = data.result;
            const etiquetas: Record<string, string> = {
                nickname: 'Nombre', name: 'Nombre', level: 'Nivel', region: 'Región',
                likes: 'Likes', signature: 'Biografía', guild: 'Clan', guildName: 'Clan'
            };
            let filas = '';
            for (const [clave, etiqueta] of Object.entries(etiquetas)) {
                const v = r[clave];
                if (v !== undefined && v !== null && v !== '' && typeof v !== 'object') {
                    filas += `❖ *${etiqueta}:* ${v}\n`;
                }
            }
            if (!filas) filas = Object.entries(r).slice(0, 8).map(([k, v]) => `❖ *${k}:* ${typeof v === 'object' ? '—' : v}`).join('\n') + '\n';

            const texto =
                '╭─────────────────╮\n' +
                '   ✧ *FREE FIRE* ✧\n' +
                '╰─────────────────╯\n\n' +
                `✦ *ID:* ${id}\n` + filas +
                '\n⋆ AKAME-MD ⋆';
            await sock.sendMessage(chat, { text: texto }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => null);
        } catch {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => null);
            await sock.sendMessage(chat, { text: `✧ No encontré una cuenta de Free Fire con el ID *${id}*.` }, { quoted: msg });
        }
    }
};
