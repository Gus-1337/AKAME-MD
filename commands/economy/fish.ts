import { GANANCIA_BASE } from '#shop';
import { UserJid } from '#simple';
import { activeEffectsLine, coinMultiplier, effectiveCooldown, titulo, money, formatDuration, ecoUser, bloqueadoPorAdmin } from '#shop';
import config from '#config';
import { saveDB } from '#db';

const PECES = [
    { nombre: 'Sardina 🐟', coins: 200, prob: 0.25 },
    { nombre: 'Pulpo 🐙', coins: 800, prob: 0.25 },
    { nombre: 'Tiburón 🦈', coins: 1500, prob: 0.25 },
    { nombre: 'Ballena 🐳', coins: 3000, prob: 0.25 }
];

const sacarPez = () => {
    let t = Math.random();
    for (const p of PECES) {
        if (t < p.prob) return p;
        t -= p.prob;
    }
    return PECES[0];
};

export default {
    command: ['fish', 'pescar'],
    description: 'Pesca y gana',
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
            const diff = Date.now() - (user.lastFish || 0);
            if (user.lastFish && diff < cooldown) {
                return reply(`「 ꕤ 」 La caña necesita secarse, vuelve en *${formatDuration(cooldown - diff)}*.`);
            }

            const pez = sacarPez();
            const ganancia = pez.coins * coinMultiplier(user) * GANANCIA_BASE;

            user.coins = (user.coins || 0) + ganancia;
            user.lastFish = Date.now();
            if (!user.inventory) user.inventory = {};
            user.inventory[pez.nombre] = (user.inventory[pez.nombre] || 0) + 1;
            saveDB(chat, jid);

            return reply(
                `${titulo('PESCA')}\n\n` +
                `   Pescaste un *${pez.nombre}*\n\n` +
                `✩ Ganaste › *+${money(ganancia)}* ${coin}\n` +
                `✩ Saldo › *${money(user.coins)}* ${coin}` +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en fish:', e);
            return reply('「 ꕤ 」 Ocurrió un error al pescar.');
        }
    }
};
