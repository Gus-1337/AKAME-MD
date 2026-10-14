import { UserJid } from '#simple';
import { activeEffectsLine, isBuffActive, softenPenalty, titulo, money, ecoUser, parseApuesta, bloqueadoPorAdmin } from '#shop';
import config from '#config';
import { saveDB } from '#db';

const carta = () => Math.floor(Math.random() * 10) + 2; // 2 a 11

export default {
    command: ['blackjack', 'bj', '21'],
    description: 'Blackjack: intenta acercarte a 21 sin pasarte',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, sender, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });
        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los juegos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const jid = await UserJid(sock, chat, sender);
            const user = ecoUser(chat, jid);
            if (!user) return reply('「 ꕤ 」 Error: La base de datos no está inicializada.');
            const coin = (config as any)?.coin || '¥enes';

            if (!args[0]) {
                return reply(
                    `${titulo('BLACKJACK')}\n\n` +
                    `❀ Uso › *${p}bj <cantidad>* o *${p}bj all*\n` +
                    `♡ Mínimo › *200 ${coin}*\n` +
                    `✦ Te acercas a 21 sin pasarte\n` +
                    `✦ Si ganas con 21 exacto, cobras x1.5`
                );
            }

            const r = parseApuesta(args[0], user.coins || 0, 200);
            if ('error' in r) return reply(`「 ꕤ 」 ${r.error}`);
            const bet = r.bet;

            let jugador = carta() + carta();
            let casa = carta() + carta();
            let reintentada = false;
            if (jugador > 21 && isBuffActive(user, 'luck')) {
                jugador = carta() + carta();
                casa = carta() + carta();
                reintentada = true;
            }

            let estado: string;
            let cambio = 0;
            if (jugador > 21) {
                cambio = -softenPenalty(user, bet);
                estado = `💥 Te pasaste de 21`;
            } else if (casa > 21 || jugador > casa) {
                cambio = jugador === 21 ? Math.floor(bet * 1.5) : bet;
                estado = jugador === 21 ? `🎉 ¡21 exacto!` : `🎉 Ganaste`;
            } else if (jugador < casa) {
                cambio = -softenPenalty(user, bet);
                estado = `😿 La casa gana`;
            } else {
                estado = `🤝 Empate, recuperas tu apuesta`;
            }

            user.coins = (user.coins || 0) + cambio;
            saveDB(chat, jid);

            const linea = cambio > 0
                ? `❀ Ganaste › *+${money(cambio)}* ${coin}`
                : cambio < 0
                    ? `❀ Perdiste › *-${money(Math.abs(cambio))}* ${coin}`
                    : `❀ Sin cambios`;

            return reply(
                `${titulo('BLACKJACK')}\n\n` +
                `♡ Tú › *${jugador}*\n` +
                `♡ Casa › *${casa}*\n\n` +
                `${estado}\n` +
                `${linea}\n` +
                `♡ Saldo › *${money(user.coins)}* ${coin}` +
                (reintentada ? `\n> 🍀 El trébol te salvó y repartió de nuevo` : '') +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en bj:', e);
            return reply('「 ꕤ 」 Ocurrió un error en el blackjack.');
        }
    }
};
