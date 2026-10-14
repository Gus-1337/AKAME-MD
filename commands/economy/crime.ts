import { UserJid } from '#simple';
import { activeEffectsLine, coinMultiplier, effectiveCooldown, luckBoost, softenPenalty, titulo, money, formatDuration, ecoUser, bloqueadoPorAdmin } from '#shop';
import { saveDB } from '#db';
import config from '#config';

const GANA = [
    'Robaste una tienda de conveniencia y escapaste con',
    'Estafaste a un millonario distraído y conseguiste',
    'Hackeaste una cuenta bancaria y te llevaste',
    'Vendiste mercancía robada en el mercado negro y ganaste',
    'Asaltaste un banco sin disparos y huiste con',
    'Participaste en una pelea clandestina y ganaste',
    'Falsificaste documentos y los vendiste por',
    'Traficaste con boletos falsos y juntaste'
];

const PIERDE = [
    'Te atraparon robando en una tienda y pagaste la fianza de',
    'La policía te detuvo y tuviste que sobornar con',
    'Un socio te traicionó y te robó',
    'Intentaste estafar al equivocado y te hizo pagar',
    'Te cayó la policía en plena operación y perdiste',
    'Compraste material falso y perdiste',
    'Tu plan falló y terminaste pagando'
];

const elegir = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export default {
    command: ['crime', 'crimen'],
    description: 'Comete un crimen para ganar o perder monedas',
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

            const cooldown = effectiveCooldown(user, 5 * 60 * 1000);
            const diff = Date.now() - (user.lastCrime || 0);
            if (user.lastCrime && diff < cooldown) {
                return reply(`「 ꕤ 」 La policía te busca, espera *${formatDuration(cooldown - diff)}* antes de otro crimen.`);
            }

            const now = Date.now();
            user.lastCrime = now;

            const perder = Math.random() < 0.25 * (1 - luckBoost(user, 0));
            if (perder) {
                const perdida = softenPenalty(user, Math.min(user.coins || 0, Math.floor(Math.random() * 15000) + 3000));
                user.coins = (user.coins || 0) - perdida;
                saveDB(chat, jid);
                return reply(
                    `${titulo('CRIMEN')}\n\n` +
                    `   ${elegir(PIERDE)}\n\n` +
                    `✩ Perdiste › *-${money(perdida)}* ${coin}\n` +
                    `✩ Saldo › *${money(user.coins)}* ${coin}` +
                    activeEffectsLine(user)
                );
            }

            const ganancia = (Math.floor(Math.random() * 15000) + 3000) * coinMultiplier(user);
            user.coins = (user.coins || 0) + ganancia;
            saveDB(chat, jid);

            return reply(
                `${titulo('CRIMEN')}\n\n` +
                `   ${elegir(GANA)}\n\n` +
                `✩ Ganaste › *+${money(ganancia)}* ${coin}\n` +
                `✩ Saldo › *${money(user.coins)}* ${coin}` +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en crime:', e);
            return reply('「 ꕤ 」 Ocurrió un error al ejecutar el crimen.');
        }
    }
};
