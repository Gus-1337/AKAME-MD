import { UserJid } from '#simple';
import config from '#config';
import { leerMonto, resolverObjetivo, cambiarCoins, textoMonto, formatear } from '../../lib/owner-coins.ts';

// Solo el dueño del bot (owner: true lo valida el handler)
export default {
    command: ['addmoney'],
    description: 'Da coins a una persona (o a ti). Usa "inf" para coins infinitas',
    category: 'owner',
    owner: true,
    group: true,
    run: async ({ chat, m, sock, args, sender }: any) => {
        const monto = leerMonto(args);
        if (!monto) {
            return sock.sendMessage(chat, {
                text: [
                    '《✧》 Uso de *.addmoney*',
                    '> .addmoney 5000 — te das 5.000 coins',
                    '> .addmoney 5000 @usuario — das 5.000 coins a esa persona',
                    '> .addmoney inf — coins infinitas (para ti, o para quien respondas)',
                    '> Responde a alguien: .addmoney 5000'
                ].join('\n')
            }, { quoted: m });
        }

        const yo = await UserJid(sock, chat, sender);
        const objetivo = UserJid(sock, chat, resolverObjetivo(m, yo));
        const nuevo = cambiarCoins(chat, objetivo, 'add', monto);
        const moneda = (config as any)?.coin || 'coins';
        const esYo = objetivo === yo;
        const quien = esYo ? 'ti' : `@${objetivo.split('@')[0]}`;
        const cantidad = monto.tipo === 'inf' ? '∞' : textoMonto(monto);

        return sock.sendMessage(chat, {
            text: [
                `《✧》 ${esYo ? 'Te diste' : 'Le diste'} *${cantidad} ${moneda}*${esYo ? '' : ' a ' + quien}.`,
                `> Nuevo saldo » *${formatear(nuevo)} ${moneda}*`
            ].join('\n'),
            mentions: esYo ? [] : [objetivo]
        }, { quoted: m });
    }
};
