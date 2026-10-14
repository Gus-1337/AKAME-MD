import { UserJid } from '#simple';
import { titulo, money, formatDuration, ecoUser, bloqueadoPorAdmin, activeEffectsLine } from '#shop';
import config from '#config';
import { saveDB } from '#db';

const RAREZAS = [
    { nombre: 'Común ⚪', min: 200, max: 1000, prob: 0.25 },
    { nombre: 'Raro 🔵', min: 1000, max: 3000, prob: 0.25 },
    { nombre: 'Épico 🟣', min: 3000, max: 8000, prob: 0.25 },
    { nombre: 'Legendario 🟡', min: 6000, max: 16000, prob: 0.25 }
];

const sacarRareza = () => {
    let t = Math.random();
    for (const r of RAREZAS) {
        if (t < r.prob) return r;
        t -= r.prob;
    }
    return RAREZAS[0];
};

export default {
    command: ['cofre', 'chest'],
    description: 'Abre un cofre con recompensa',
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

            const COOLDOWN = 15 * 60 * 1000;
            const diff = Date.now() - (user.lastCofre || 0);
            if (user.lastCofre && diff < COOLDOWN) {
                return reply(`「 ꕤ 」 Aún no hay otro cofre disponible, vuelve en *${formatDuration(COOLDOWN - diff)}*.`);
            }

            const rareza = sacarRareza();
            const premio = Math.floor(Math.random() * (rareza.max - rareza.min + 1)) + rareza.min;

            user.coins = (user.coins || 0) + premio;
            user.lastCofre = Date.now();
            saveDB(chat, jid);

            return reply(
                `${titulo('COFRE')}\n\n` +
                `   Abriste un cofre *${rareza.nombre}*\n\n` +
                `✩ Ganaste › *+${money(premio)}* ${coin}\n` +
                `✩ Saldo › *${money(user.coins)}* ${coin}` +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en cofre:', e);
            return reply('「 ꕤ 」 Ocurrió un error al abrir el cofre.');
        }
    }
};
