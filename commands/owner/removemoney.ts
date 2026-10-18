import { UserJid } from '#simple';
import config from '#config';
import { leerMonto, resolverObjetivo, cambiarCoins, textoMonto, formatear } from '../../lib/owner-coins.ts';

// Solo el dueño del bot (owner: true lo valida el handler)
export default {
    command: ['removemoney'],
    description: 'Quita coins a una persona (o a ti). Usa "inf" para quitarle todas',
    category: 'owner',
    owner: true,
    group: true,
    run: async ({ chat, m, sock, args, sender }: any) => {
        const monto = leerMonto(args);
        if (!monto) {
            return sock.sendMessage(chat, {
                text: [
                    '《✧》 Uso de *.removemoney*',
                    '> .removemoney 5000 — te quitas 5.000 coins',
                    '> .removemoney 5000 @usuario — le quitas 5.000 coins a esa persona',
                    '> .removemoney inf — le quitas todas sus coins',
                    '> Responde a alguien: .removemoney 5000'
                ].join('\n')
            }, { quoted: m });
        }

        const yo = await UserJid(sock, chat, sender);
        const objetivo = UserJid(sock, chat, resolverObjetivo(m, yo));
        const nuevo = cambiarCoins(chat, objetivo, 'remove', monto);
        const moneda = (config as any)?.coin || 'coins';
        const esYo = objetivo === yo;
        const quien = esYo ? 'ti' : `@${objetivo.split('@')[0]}`;
        const cantidad = monto.tipo === 'inf' ? 'todas las' : textoMonto(monto);

        return sock.sendMessage(chat, {
            text: [
                `《✧》 ${esYo ? 'Te quitaste' : 'Le quitaste'} *${cantidad} ${moneda}*${esYo ? '' : ' a ' + quien}.`,
                `> Nuevo saldo » *${formatear(nuevo)} ${moneda}*`
            ].join('\n'),
            mentions: esYo ? [] : [objetivo]
        }, { quoted: m });
    }
};
