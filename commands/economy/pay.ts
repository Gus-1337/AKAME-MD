import { UserJid } from '#simple';
import { saveDB } from '#db';
import config from '#config';
import { titulo, money, ecoUser, bloqueadoPorAdmin } from '#shop';

const soloDigitos = (x: string) => String(x).split('@')[0].split(':').pop()?.replace(/[^\d]/g, '') || '';

export default {
    command: ['pay', 'transfer', 'give'],
    description: 'Transfiere monedas del banco a otro usuario',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });
        const uso = `${titulo('TRANSFERIR')}\n\n❀ Uso › *${p}pay <cantidad> @usuario*\n❀ Ejemplo › *${p}pay 25000 @usuario*\n♡ Mínimo › *1.000*\n> Se transfiere desde tu *banco*`;
        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const dbData = (global as any).db?.data;
            if (!dbData) return reply('「 ꕤ 」 Error: La base de datos no está inicializada.');
            const coin = (config as any)?.coin || '¥enes';

            const realSender = await UserJid(sock, chat, sender);
            const ctxInfo = m.message?.extendedTextMessage?.contextInfo;
            const mentionedJid = ctxInfo?.mentionedJid?.[0];
            const quotedSender = ctxInfo?.quotedMessage?.key?.sender;
            const participant = ctxInfo?.participant;

            let targetJid: string | null = null;
            if (mentionedJid) targetJid = await UserJid(sock, chat, mentionedJid);
            else if (quotedSender) targetJid = await UserJid(sock, chat, quotedSender);
            else if (participant) targetJid = await UserJid(sock, chat, participant);

            if (!targetJid) return reply(uso);
            if (targetJid === realSender) return reply(`「 ꕤ 」 No puedes transferirte a ti mismo.`);

            const cantidad = parseInt(String(args[0] || '').replace(/[^0-9]/g, ''));
            if (!cantidad || cantidad <= 0) return reply(uso);
            if (cantidad < 1000) return reply(`「 ꕤ 」 La transferencia mínima es *${money(1000)} ${coin}*.`);

            const emisor = ecoUser(chat, realSender);
            const chatUsers = dbData.chats[chat].users;
            let receptor = chatUsers[targetJid];
            let receptorKey = targetJid;
            if (!receptor) {
                const num = soloDigitos(targetJid);
                for (const [k, v] of Object.entries(chatUsers)) {
                    if (soloDigitos(k) === num) { receptor = v; receptorKey = k; break; }
                }
            }
            if (!receptor) return reply(`「 ꕤ 」 Ese usuario no tiene cuenta de economía en este grupo.`);

            const banco = emisor.bank || 0;
            if (banco < cantidad) {
                return reply(`「 ꕤ 」 No tienes suficiente en el banco. Tienes *${money(banco)} ${coin}*.`);
            }

            emisor.bank = banco - cantidad;
            receptor.bank = (receptor.bank || 0) + cantidad;
            saveDB(chat, realSender);
            saveDB(chat, receptorKey);

            return sock.sendMessage(chat, {
                text:
                    `${titulo('TRANSFERENCIA')}\n\n` +
                    `   Enviaste *${money(cantidad)}* ${coin} a @${receptorKey.split('@')[0]}\n\n` +
                    `♡ Tu banco › *${money(emisor.bank)}* ${coin}`,
                mentions: [receptorKey]
            }, { quoted: m });
        } catch (e) {
            console.error('Error en pay:', e);
            return reply('「 ꕤ 」 Ocurrió un error al transferir.');
        }
    }
};
