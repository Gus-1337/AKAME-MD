import { GANANCIA_BASE } from '#shop';
import { UserJid } from '#simple';
import { activeEffectsLine, coinMultiplier, effectiveCooldown, softenPenalty, titulo, money, formatDuration, ecoUser, bloqueadoPorAdmin } from '#shop';
import { saveDB } from '#db';
import config from '#config';

const GANA = [
    'Cargaste cajas en el mercado toda la tarde y ganaste',
    'Repartiste pizzas bajo la lluvia y recibiste',
    'Programaste toda la noche y tu jefe te pagó',
    'Limpiaste oficinas a escondidas y conseguiste',
    'Vendiste limonada en el parque y juntaste',
    'Ayudaste a una anciana a cruzar y te dio',
    'Ganaste un mini torneo de barrio y te llevaste',
    'Hiciste un mandado urgente y te pagaron',
    'Tradujiste un texto aburrido y cobraste'
];

const PIERDE = [
    'Tu jefe te estafó y perdiste',
    'Te robaron la cartera camino al trabajo y perdiste',
    'Invertiste en un negocio trucho y perdiste',
    'Te multaron por estacionar mal y perdiste',
    'Un cliente no te pagó y perdiste',
    'Te hackearon la cuenta y perdiste',
    'Tropezaste y se te cayeron las monedas, perdiste',
    'El banco te cobró comisiones y perdiste'
];

const elegir = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export default {
    command: ['work', 'w'],
    description: 'Trabaja para ganar monedas',
    category: 'economy',
    group: true,
    run: async (ctx: any) => {
        const { chat, m, sock, sender, usedPrefix, prefix } = ctx;
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });

        try {
            if (bloqueadoPorAdmin(chat)) {
                return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            }
            const jid = await UserJid(sock, chat, sender);
            const user = ecoUser(chat, jid);
            if (!user) return reply('「 ꕤ 」 Error: La base de datos no está inicializada.');
            const coin = (config as any)?.coin || '¥enes';

            const now = Date.now();
            const cooldown = effectiveCooldown(user, 60 * 1000);
            const diff = now - (user.lastWork || 0);
            if (user.lastWork && diff < cooldown) {
                return reply(`「 ꕤ 」 Vuelve en *${formatDuration(cooldown - diff)}* para trabajar de nuevo.`);
            }

            user.lastWork = now;

            if (Math.random() < 0.25) {
                const perdida = softenPenalty(user, Math.min(user.coins || 0, Math.floor(Math.random() * 5000) + 1000));
                user.coins = (user.coins || 0) - perdida;
                saveDB(chat, jid);
                return reply(
                    `${titulo('TRABAJO')}\n\n` +
                    `   ${elegir(PIERDE)}\n\n` +
                    `✩ Perdiste › *-${money(perdida)}* ${coin}\n` +
                    `✩ Saldo › *${money(user.coins)}* ${coin}` +
                    activeEffectsLine(user)
                );
            }

            const ganancia = (Math.floor(Math.random() * 10000) + 1) * coinMultiplier(user) * GANANCIA_BASE;
            user.coins = (user.coins || 0) + ganancia;
            saveDB(chat, jid);

            return reply(
                `${titulo('TRABAJO')}\n\n` +
                `   ${elegir(GANA)}\n\n` +
                `✩ Ganaste › *+${money(ganancia)}* ${coin}\n` +
                `✩ Saldo › *${money(user.coins)}* ${coin}` +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en work:', e);
            return reply('「 ꕤ 」 Ocurrió un error al trabajar.');
        }
    }
};
