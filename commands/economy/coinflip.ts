import { UserJid } from '#simple';
import { activeEffectsLine, isBuffActive, titulo, money, ecoUser, parseApuesta, bloqueadoPorAdmin } from '#shop';
import { saveDB } from '#db';
import config from '#config';

export default {
    command: ['cf', 'coinflip', 'flip'],
    description: 'Apuesta al cara o cruz',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
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
                    `${titulo('CARA O CRUZ')}\n\n` +
                    `✧ Uso › *${p}cf <cantidad>* o *${p}cf all*\n` +
                    `✩ Mínimo › *200 ${coin}*\n` +
                    `✦ Ganas el doble si aciertas`
                );
            }

            const r = parseApuesta(args[0], user.coins || 0, 200);
            if ('error' in r) return reply(`「 ꕤ 」 ${r.error}`);
            const bet = r.bet;

            const eleccion = 'Cara';
            const resultado = Math.random() < 0.5 ? 'Cara' : 'Cruz';
            const salvado = resultado !== eleccion && isBuffActive(user, 'luck');
            const gano = eleccion === resultado || salvado;

            user.coins = (user.coins || 0) + (gano ? bet : -bet);
            saveDB(chat, jid);

            const linea = gano
                ? `✧ Ganaste › *+${money(bet)}* ${coin}`
                : `✧ Perdiste › *-${money(bet)}* ${coin}`;

            return reply(
                `${titulo('CARA O CRUZ')}\n\n` +
                `   🪙 Cayó *${resultado}*\n\n` +
                `✩ Tu elección › ${eleccion}\n` +
                `${linea}\n` +
                `✩ Saldo › *${money(user.coins)}* ${coin}` +
                (salvado ? `\n> 🍀 El trébol inclinó la moneda a tu favor` : '') +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en cf:', e);
            return reply('「 ꕤ 」 Ocurrió un error al ejecutar la apuesta.');
        }
    }
};
