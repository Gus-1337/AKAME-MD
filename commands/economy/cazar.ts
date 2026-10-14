import { GANANCIA_BASE } from '#shop';
import { UserJid } from '#simple';
import { activeEffectsLine, coinMultiplier, effectiveCooldown, titulo, money, formatDuration, ecoUser, bloqueadoPorAdmin } from '#shop';
import config from '#config';
import { saveDB } from '#db';

const ANIMALES = [
    { nombre: 'Conejo 🐰', coins: 300, prob: 0.1667 },
    { nombre: 'Zorro 🦊', coins: 600, prob: 0.1667 },
    { nombre: 'Jabalí 🐗', coins: 1200, prob: 0.1667 },
    { nombre: 'Lobo 🐺', coins: 900, prob: 0.1667 },
    { nombre: 'Oso 🐻', coins: 1500, prob: 0.1667 },
    { nombre: 'Dragón 🐉', coins: 5000, prob: 0.1667 }
];

const sacarAnimal = () => {
    let t = Math.random();
    for (const a of ANIMALES) {
        if (t < a.prob) return a;
        t -= a.prob;
    }
    return ANIMALES[0];
};

export default {
    command: ['cazar', 'hunt', 'casa'],
    description: 'Caza animales para ganar coins',
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

            const cooldown = effectiveCooldown(user, 3 * 60 * 1000);
            const diff = Date.now() - (user.lastCazar || 0);
            if (user.lastCazar && diff < cooldown) {
                return reply(`「 ꕤ 」 Los animales se esconden, vuelve en *${formatDuration(cooldown - diff)}*.`);
            }

            const animal = sacarAnimal();
            const ganancia = (animal.coins + Math.floor(Math.random() * 300)) * coinMultiplier(user) * GANANCIA_BASE;

            user.coins = (user.coins || 0) + ganancia;
            user.lastCazar = Date.now();
            saveDB(chat, jid);

            return reply(
                `${titulo('CACERÍA')}\n\n` +
                `   Cazaste un *${animal.nombre}*\n\n` +
                `✩ Ganaste › *+${money(ganancia)}* ${coin}\n` +
                `✩ Saldo › *${money(user.coins)}* ${coin}` +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en cazar:', e);
            return reply('「 ꕤ 」 Ocurrió un error al cazar.');
        }
    }
};
