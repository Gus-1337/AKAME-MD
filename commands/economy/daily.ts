import { GANANCIA_BASE } from '#shop';
import { UserJid } from '#simple';
import { coinMultiplier, titulo, money, formatDuration, ecoUser, bloqueadoPorAdmin } from '#shop';
import { saveDB } from '#db';
import config from '#config';

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const BASE = 30000;
const PASO = 5000;

export default {
    command: ['daily', 'diario'],
    description: 'Reclama tu recompensa diaria (racha de días)',
    category: 'economy',
    group: true,
    run: async (ctx: any) => {
        const { chat, m, sock, sender, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });
        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const jid = await UserJid(sock, chat, sender);
            const user = ecoUser(chat, jid);
            if (!user) return reply('「 ꕤ 」 Error: La base de datos no está inicializada.');
            const coin = (config as any)?.coin || '¥enes';

            const now = Date.now();
            const last = user.lastDaily || 0;
            const diff = now - last;
            if (last && diff < DIA) {
                return reply(
                    `${titulo('DIARIO')}\n\n` +
                    `   Ya reclamaste tu recompensa de hoy\n\n` +
                    `✩ Vuelve en › *${formatDuration(DIA - diff)}*\n` +
                    `✩ Racha › *${user.streak || 0}* día(s)`
                );
            }

            const perdioRacha = last > 0 && diff > 2 * DIA;
            const streak = (perdioRacha ? 0 : (user.streak || 0)) + 1;
            const premio = (BASE + (streak - 1) * PASO) * coinMultiplier(user) * GANANCIA_BASE;
            const siguiente = (BASE + streak * PASO) * GANANCIA_BASE;

            user.coins = (user.coins || 0) + premio;
            user.streak = streak;
            user.lastDaily = now;
            saveDB(chat, jid);

            return reply(
                `${titulo('DIARIO')}\n\n` +
                `   ¡Recompensa del día *${streak}* reclamada!\n\n` +
                `✩ Ganaste › *+${money(premio)}* ${coin}\n` +
                `✩ Saldo › *${money(user.coins)}* ${coin}\n` +
                `✩ Mañana › *+${money(siguiente)}* ${coin}` +
                (perdioRacha ? `\n> ☆ Perdiste tu racha, empieza de nuevo` : '')
            );
        } catch (e) {
            console.error('Error en daily:', e);
            return reply('「 ꕤ 」 Ocurrió un error al reclamar la recompensa diaria.');
        }
    }
};
