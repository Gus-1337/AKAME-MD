import { UserJid } from '#simple';
import { activeEffectsLine, titulo, money, ecoUser, parseApuesta, bloqueadoPorAdmin } from '#shop';
import { saveDB } from '#db';
import config from '#config';

const COLORES: Record<string, string> = { red: 'rojo', rojo: 'rojo', black: 'negro', negro: 'negro', green: 'verde', verde: 'verde', '0': 'verde' };
const EMOJI: Record<string, string> = { rojo: '🔴', negro: '⚫', verde: '🟢' };

export default {
    command: ['rt', 'ruleta', 'roulette', 'rtl'],
    description: 'Ruleta: apuesta a rojo o negro',
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

            const uso = `${titulo('RULETA')}\n\n` +
                `✧ Uso › *${p}rt <rojo|negro> <cantidad>*\n` +
                `✧ Ejemplo › *${p}rt negro all*\n` +
                `✩ Mínimo › *200 ${coin}*\n` +
                `✦ Acertar paga el doble\n` +
                `✦ El 0 (🟢 verde) se lleva las apuestas de color`;

            const a1 = (args[0] || '').toLowerCase();
            const a2 = (args[1] || '').toLowerCase();
            let colorRaw = COLORES[a1] ? a1 : (COLORES[a2] ? a2 : '');
            const cantidadRaw = COLORES[a1] ? a2 : a1;
            if (!colorRaw || colorRaw === 'verde' || colorRaw === 'green' || colorRaw === '0') {
                return reply(uso);
            }
            const eleccion = COLORES[colorRaw];

            const r = parseApuesta(cantidadRaw, user.coins || 0, 200);
            if ('error' in r) return reply(`「 ꕤ 」 ${r.error}`);
            const bet = r.bet;

            // Ruleta de 37 casillas: 0 (verde), 18 rojas y 18 negras
            const n = Math.floor(Math.random() * 37);
            const resultado = n === 0 ? 'verde' : (n % 2 === 1 ? 'rojo' : 'negro');
            const gano = resultado === eleccion;

            user.coins = (user.coins || 0) + (gano ? bet : -bet);
            saveDB(chat, jid);

            const linea = gano
                ? `✧ Ganaste › *+${money(bet)}* ${coin}`
                : `✧ Perdiste › *-${money(bet)}* ${coin}`;

            return reply(
                `${titulo('RULETA')}\n\n` +
                `   ${EMOJI[resultado]} Cayó *${resultado}* (${n})\n\n` +
                `✩ Apostaste a › ${EMOJI[eleccion]} ${eleccion}\n` +
                `${linea}\n` +
                `✩ Saldo › *${money(user.coins)}* ${coin}` +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en rt:', e);
            return reply('「 ꕤ 」 Ocurrió un error al ejecutar la ruleta.');
        }
    }
};
