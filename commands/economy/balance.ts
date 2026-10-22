import { formatear } from '../../lib/owner-coins.ts';
import { UserJid } from '#simple';
import config from '#config';
import { generarTarjetaBalance } from '../../lib/tarjeta-balance.ts';

const normalizeNumber = (x: string) => {
    if (!x) return '';
    let cleaned = String(x).split('@')[0].split(':').pop() || '';
    cleaned = cleaned.replace(/[^\d]/g, '');
    return cleaned;
};

export default {
    command: ['bal', 'balance', 'coins'],
    description: 'Muestra el balance de un usuario',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, sender }: any) => {
        try {
            const realSender = await UserJid(sock, chat, sender);
            const q = args[0];
            const dbData = (global as any).db?.data;
            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};
            if (!dbData.users) dbData.users = {};
            const chatDb = dbData.chats[chat];
            const chatUsers = chatDb.users || (chatDb.users = {});

            if (chatDb.adminonly) return;

            let mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            let participant = m.message?.extendedTextMessage?.contextInfo?.participant;
            let targetJid: string;
            let targetNumber: string;

            if (mentionedJid) {
                const r = await UserJid(sock, chat, mentionedJid);
                targetJid = r; targetNumber = normalizeNumber(r);
            } else if (participant) {
                const r = await UserJid(sock, chat, participant);
                targetJid = r; targetNumber = normalizeNumber(r);
            } else if (q && !q.startsWith('@')) {
                const clean = q.replace(/[^0-9]/g, '');
                if (clean) { targetJid = clean + '@s.whatsapp.net'; targetNumber = clean; }
                else { targetJid = realSender; targetNumber = normalizeNumber(realSender); }
            } else {
                targetJid = realSender; targetNumber = normalizeNumber(realSender);
            }

            let userInChat = chatUsers[targetJid];
            if (!userInChat) {
                for (const [key, value] of Object.entries(chatUsers)) {
                    if (normalizeNumber(key) === targetNumber) {
                        userInChat = value; targetJid = key; break;
                    }
                }
            }
            if (!userInChat) return await sock.sendMessage(chat, { text: 'ꕤ El usuario no tiene cuenta de economía en este grupo (｡•́︿•̀｡)' }, { quoted: m });

            const coinName = (config as any)?.coin || '¥enes';
            const coins = Number(userInChat.coins) || 0;
            const bank = Number(userInChat.bank) || 0;
            const total = coins + bank;
            const fmt = (n: number) => formatear(n); // ∞ cuando son coins infinitas

            const etiquetaUsuario = `@${targetJid.split('@')[0]}`;
            const nombre = (dbData.users?.[targetJid]?.name) || userInChat.name || etiquetaUsuario.slice(1);
            const caption =
`✦ *BALANCE* ✦
   ❀ Usuario › ${etiquetaUsuario}

   ♡ Efectivo › *${fmt(coins)}* ${coinName}
   ♡ Banco › *${fmt(bank)}* ${coinName}
   ✧ Total › *${fmt(total)}* ${coinName}

> Usa *.dep* o *.with* para mover tu dinero 💰`;

            // Tarjeta dorada con el fondo de Akame. Si falla el canvas, se manda el texto.
            try {
                const tarjeta = await generarTarjetaBalance({
                    nombre: String(nombre),
                    efectivo: fmt(coins),
                    banco: fmt(bank),
                    total: fmt(total),
                    moneda: coinName
                });
                await sock.sendMessage(chat, { image: tarjeta, caption, mentions: [targetJid] }, { quoted: m });
            } catch (err: any) {
                console.error('[BAL] tarjeta falló, se manda texto:', err?.message);
                await sock.sendMessage(chat, { text: caption, mentions: [targetJid] }, { quoted: m });
            }

        } catch (e) {
            console.error('Error en bal:', e);
        }
    }
};
