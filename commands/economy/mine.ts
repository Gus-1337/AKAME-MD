import { UserJid } from '#simple';
import { activeEffectsLine, coinMultiplier, effectiveCooldown, titulo, money, formatDuration, ecoUser, bloqueadoPorAdmin } from '#shop';
import config from '#config';
import { saveDB } from '#db';

const MINERALES = [
    { nombre: 'Carbón ⬛' },
    { nombre: 'Hierro 🔩' },
    { nombre: 'Oro 🥇' },
    { nombre: 'Diamante 💠' }
];

export default {
    command: ['mine', 'minar', 'mina'],
    description: 'Mina y gana coins',
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

            const cooldown = effectiveCooldown(user, 2 * 60 * 1000);
            const diff = Date.now() - (user.lastMine || 0);
            if (user.lastMine && diff < cooldown) {
                return reply(`「 ꕤ 」 Tu pico está descansando, vuelve en *${formatDuration(cooldown - diff)}*.`);
            }

            const base = Math.floor(Math.random() * 2001) + 500; // 500 a 2500, igual que antes
            const ganancia = base * coinMultiplier(user);
            const mineral = base < 1000 ? MINERALES[0] : base < 1600 ? MINERALES[1] : base < 2200 ? MINERALES[2] : MINERALES[3];

            user.coins = (user.coins || 0) + ganancia;
            user.lastMine = Date.now();
            saveDB(chat, jid);

            return reply(
                `${titulo('MINERÍA')}\n\n` +
                `   Sacaste *${mineral.nombre}*\n\n` +
                `✩ Ganaste › *+${money(ganancia)}* ${coin}\n` +
                `✩ Saldo › *${money(user.coins)}* ${coin}` +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en mine:', e);
            return reply('「 ꕤ 」 Ocurrió un error al minar.');
        }
    }
};
