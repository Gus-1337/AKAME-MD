import { UserJid } from '#simple';
import { activeEffectsLine, isBuffActive, titulo, money, ecoUser, parseApuesta, bloqueadoPorAdmin } from '#shop';
import config from '#config';
import { saveDB } from '#db';

const SIMBOLOS = ['🍒', '🍋', '🍇', '💎', '7️⃣'];
const giro = () => SIMBOLOS[Math.floor(Math.random() * SIMBOLOS.length)];

/** Devuelve la ganancia NETA (lo que se suma al saldo) y el nombre de la combinación. */
const premio = (a: string, b: string, c: string, bet: number): { neto: number; nombre: string } => {
    if (a === b && b === c) {
        if (a === '7️⃣') return { neto: bet * 10, nombre: '¡JACKPOT 7️⃣7️⃣7️⃣!' };
        if (a === '💎') return { neto: bet * 7, nombre: '¡Triple 💎!' };
        return { neto: bet * 4, nombre: `¡Triple ${a}!` };
    }
    if (a === b || b === c || a === c) return { neto: Math.floor(bet * 0.3), nombre: 'Dos iguales' };
    return { neto: 0, nombre: 'Sin combinación' };
};

export default {
    command: ['slots', 'tragamonedas', 'slot'],
    description: 'Tragamonedas: apuesta y gira',
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
                    `${titulo('TRAGAMONEDAS')}\n\n` +
                    `❀ Uso › *${p}slots <cantidad>* o *${p}slots all*\n` +
                    `♡ Mínimo › *100 ${coin}*\n\n` +
                    `✦ 7️⃣ x3 › x10  |  💎 x3 › x7\n` +
                    `✦ Otro triple › x4\n` +
                    `✦ Dos iguales › +30%`
                );
            }

            const r = parseApuesta(args[0], user.coins || 0, 100);
            if ('error' in r) return reply(`「 ꕤ 」 ${r.error}`);
            const bet = r.bet;

            let a = giro(), b = giro(), c = giro();
            let res = premio(a, b, c, bet);
            let reintentada = false;
            if (res.neto === 0 && isBuffActive(user, 'luck')) {
                a = giro(); b = giro(); c = giro();
                res = premio(a, b, c, bet);
                reintentada = true;
            }

            user.coins = (user.coins || 0) + (res.neto > 0 ? res.neto : -bet);
            saveDB(chat, jid);

            const resultado = res.neto > 0
                ? `❀ Ganaste › *+${money(res.neto)}* ${coin}`
                : `❀ Perdiste › *-${money(bet)}* ${coin}`;

            return reply(
                `${titulo('TRAGAMONEDAS')}\n\n` +
                `   [ ${a} | ${b} | ${c} ]\n\n` +
                `♡ Combinación › ${res.nombre}\n` +
                `${resultado}\n` +
                `♡ Saldo › *${money(user.coins)}* ${coin}` +
                (reintentada && res.neto > 0 ? `\n> 🍀 El trébol te dio una tirada extra` : '') +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en slots:', e);
            return reply('「 ꕤ 」 Ocurrió un error en el tragamonedas.');
        }
    }
};
