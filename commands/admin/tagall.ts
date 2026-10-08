import { UserJid } from '#simple';
import config from '#config';
import { broadcast } from '#index';

export default {
    command: ['tagall', 'todos', 'all'],
    description: 'Menciona a todos los participantes del grupo',
    category: 'admin',
    group: true,
    admin: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;
        try {
            const groupMetadata = await sock.groupMetadata(chat).catch(() => null);
            if (!groupMetadata) return;

            const participantes = groupMetadata.participants || [];
            const textoExtra = args.length > 0? args.join(' ') : '¡Atención a todos!';
            const botname = config.botName || 'AKAME-MD';

            const parsedParticipants = [];
            for (const u of participantes) {
                const resolvedJid = UserJid(sock, chat, u.id) || u.id;
                const numberOnly = String(resolvedJid).split('@')[0].split(':')[0].replace(/[^\d]/g, "");
                parsedParticipants.push({
                    id: resolvedJid,
                    number: numberOnly
                });
            }

            parsedParticipants.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));

            let mensaje = `✿ ♡ *— MENCION GENERAL —* ♡ ✿\n`;
            mensaje += `♡ Grupo » *${groupMetadata.subject}*\n`;
            mensaje += `♡ Miembros » *${parsedParticipants.length}*\n`;
            mensaje += `♡ Mensaje » ${textoExtra}\n\n`;

            const menciones = [];
            for (const p of parsedParticipants) {
                mensaje += `✿ @${p.number}\n`;
                menciones.push(p.id);
            }

            mensaje += `\n✿ ♡ *${botname}* ♡ ✿`;

            queueMicrotask(() => {
                broadcast('tagall_executed', {
                    chat,
                    totalTagged: parsedParticipants.length,
                    triggeredBy: msg.sender
                });
            });

            await sock.sendMessage(chat, {
                text: mensaje.trim(),
                contextInfo: { mentionedJid: menciones }
            }, { quoted: msg });
        } catch (e: any) {
            queueMicrotask(() => {
                broadcast('tagall_error', {
                    chat,
                    error: e?.message || 'Error en tagall'
                });
            });
        }
    }
};
