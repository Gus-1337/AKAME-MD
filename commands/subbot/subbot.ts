import { buscarSubbot } from '../../lib/subbots.ts';

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

const numeroDelRemitente = (ctx: any): string => {
    const candidatos = [ctx.msg?.key?.remoteJidAlt, ctx.msg?.sender, ctx.sender, ctx.msg?.key?.participant, ctx.chat];
    for (const c of candidatos) {
        if (typeof c === 'string' && c.endsWith('@s.whatsapp.net')) {
            return c.split('@')[0].split(':')[0].replace(/\D/g, '');
        }
    }
    return '';
};

const ESTADOS: Record<string, string> = {
    emparejando: '⏳ esperando vinculación',
    conectado: '✅ conectado',
    caido: '⚠️ caído (usa .reactivar en el bot principal)',
    pausado: '⏸️ pausado (usa .reactivar en el bot principal)'
};

export default {
    command: ['subbot', 'misubbot'],
    description: 'Muestra el estado de tu subbot',
    category: 'subbot',
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;
        const numero = numeroDelRemitente(ctx) || String(args?.[0] || '').replace(/\D/g, '');
        const sb = numero ? buscarSubbot(numero) : undefined;

        if (!sb) {
            return sock.sendMessage(chat, {
                text: caja('SUBBOT', ['✧ No tienes un subbot todavía.', '✦ Escribe .code en privado para crear uno.'])
            }, { quoted: msg });
        }

        return sock.sendMessage(chat, {
            text: caja('TU SUBBOT', [
                `✧ Estado » ${ESTADOS[sb.estado] || sb.estado}`,
                `✦ Creado » ${new Date(sb.creado).toLocaleString('es-PE')}`,
                '',
                'Desde tu subbot puedes usar: .menu'
            ])
        }, { quoted: msg });
    }
};
