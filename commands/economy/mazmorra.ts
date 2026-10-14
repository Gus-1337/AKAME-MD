import { GANANCIA_BASE } from '#shop';
import { UserJid } from '#simple';
import { activeEffectsLine, luckBoost, softenPenalty, titulo, money, formatDuration, ecoUser, bloqueadoPorAdmin } from '#shop';
import config from '#config';
import { saveDB } from '#db';

export default {
    command: ['mazmorra', 'dungeon'],
    description: 'Entra a la mazmorra: puedes ganar mucho o perder',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, sender, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });
        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const jid = await UserJid(sock, chat, sender);
            const user = ecoUser(chat, jid);
            if (!user) return reply('「 ꕤ 」 Error: La base de datos no está inicializada.');
            const coin = (config as any)?.coin || '¥enes';

            const COOLDOWN = 30 * 60 * 1000;
            const diff = Date.now() - (user.lastMazmorra || 0);
            if (user.lastMazmorra && diff < COOLDOWN) {
                return reply(`${titulo('MAZMORRA')}\n\n   La mazmorra está en descanso\n♡ Vuelve en › *${formatDuration(COOLDOWN - diff)}*`);
            }

            const boost = luckBoost(user, 0);
            const tiro = Math.random();
            let cambio = 0;
            let historia: string;

            if (tiro < 0.5 + boost) {
                cambio = Math.floor(Math.random() * 7000) + 3000;
                historia = 'Entraste y saliste con un botín';
            } else if (tiro < 0.75 + boost) {
                cambio = Math.floor(Math.random() * 12000) + 8000;
                historia = '¡Encontraste un cofre legendario!';
            } else if (tiro < 0.9 + boost * 0.5) {
                cambio = -softenPenalty(user, Math.floor(Math.random() * 3000) + 1000);
                historia = 'Un monstruo te atacó y tuviste que huir';
            } else {
                historia = 'Caminaste por horas y no encontraste nada';
            }

            if (cambio > 0) cambio *= GANANCIA_BASE;
            const antes = user.coins || 0;
            user.coins = Math.max(0, antes + cambio);
            user.lastMazmorra = Date.now();
            saveDB(chat, jid);

            const linea = cambio > 0
                ? `♡ Ganaste › *+${money(cambio)}* ${coin}`
                : cambio < 0
                    ? `♡ Perdiste › *-${money(Math.min(antes, Math.abs(cambio)))}* ${coin}`
                    : `♡ Sin cambios`;

            return reply(
                `${titulo('MAZMORRA')}\n\n` +
                `   ${historia}\n\n` +
                `${linea}\n` +
                `♡ Saldo › *${money(user.coins)}* ${coin}` +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en mazmorra:', e);
            return reply('「 ꕤ 」 Ocurrió un error en la mazmorra.');
        }
    }
};
