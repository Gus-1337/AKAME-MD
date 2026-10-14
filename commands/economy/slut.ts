import { UserJid } from '#simple';
import { activeEffectsLine, titulo, money, formatDuration, ecoUser, bloqueadoPorAdmin } from '#shop';
import { saveDB } from '#db';
import config from '#config';

const GANA = [
    'Atendiste a un cliente con su cosplay favorito y te dieron',
    'Un cliente generoso te pagó una noche completa y recibiste',
    'Grabaste contenido exclusivo y lo vendiste por',
    'Un cliente te pagó por acompañarlo a una cena y ganaste',
    'Te contrataron para una despedida de soltero y conseguiste',
    'Un cliente rico te dio una propina generosa de'
];

const PIERDE = [
    'Un cliente se escapó sin pagarte y perdiste',
    'Te cayó la policía en plena noche y sobornaste con',
    'Un cliente abusivo te estafó y perdiste',
    'La cuenta se te bloqueó y perdiste',
    'Te cancelaron el show y perdiste',
    'La plataforma te cobró comisiones y perdiste'
];

const elegir = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

export default {
    command: ['slut'],
    description: 'Trabaja como escort para ganar o perder monedas',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });
        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const jid = await UserJid(sock, chat, sender);
            const user = ecoUser(chat, jid);
            if (!user) return reply('「 ꕤ 」 Error: La base de datos no está inicializada.');
            const coin = (config as any)?.coin || '¥enes';

            const cooldown = 4 * 60 * 1000;
            const diff = Date.now() - (user.lastSlut || 0);
            if (user.lastSlut && diff < cooldown) {
                return reply(`「 ꕤ 」 Descansa un momento, vuelve en *${formatDuration(cooldown - diff)}*.`);
            }
            user.lastSlut = Date.now();

            if (Math.random() < 0.30) {
                const perdida = Math.min(user.coins || 0, Math.floor(Math.random() * 8000) + 2000);
                user.coins = (user.coins || 0) - perdida;
                saveDB(chat, jid);
                return reply(
                    `${titulo('TRABAJO NOCTURNO')}\n\n` +
                    `   ${elegir(PIERDE)}\n\n` +
                    `✩ Perdiste › *-${money(perdida)}* ${coin}\n` +
                    `✩ Saldo › *${money(user.coins)}* ${coin}` +
                    activeEffectsLine(user)
                );
            }

            const ganancia = Math.floor(Math.random() * 10000) + 1000;
            user.coins = (user.coins || 0) + ganancia;
            saveDB(chat, jid);
            return reply(
                `${titulo('TRABAJO NOCTURNO')}\n\n` +
                `   ${elegir(GANA)}\n\n` +
                `✩ Ganaste › *+${money(ganancia)}* ${coin}\n` +
                `✩ Saldo › *${money(user.coins)}* ${coin}` +
                activeEffectsLine(user)
            );
        } catch (e) {
            console.error('Error en slut:', e);
            return reply('「 ꕤ 」 Ocurrió un error al ejecutar el comando.');
        }
    }
};
