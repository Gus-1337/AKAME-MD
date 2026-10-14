import { buscarSubbot, reactivarSubbot } from '../../lib/subbots.ts';

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

const numeroDelRemitente = (ctx: any): string => {
    const candidatos = [ctx.msg?.key?.remoteJidAlt, ctx.msg?.key?.participantAlt, ctx.msg?.sender, ctx.sender, ctx.msg?.key?.participant, ctx.chat];
    for (const c of candidatos) {
        if (typeof c === 'string' && c.endsWith('@s.whatsapp.net')) {
            return c.split('@')[0].split(':')[0].replace(/\D/g, '');
        }
    }
    return '';
};

export default {
    command: ['reactivar'],
    description: 'Vuelve a encender tu subbot si lo apagaste con .stop',
    category: 'subbot',
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;
        const responder = (texto: string) => sock.sendMessage(chat, { text: texto }, { quoted: msg });

        const numero = numeroDelRemitente(ctx) || String(args?.[0] || '').replace(/\D/g, '');
        if (!numero) {
            return responder(caja('REACTIVAR', ['✧ No pude leer tu número.', '✦ Escribe: .reactivar 51999999999']));
        }

        const sb = buscarSubbot(numero);
        if (!sb) {
            return responder(caja('REACTIVAR', ['✧ No tienes un subbot.', '✦ Escribe .code para crear uno.']));
        }

        const resultado = reactivarSubbot(sb.id);
        if (resultado === 'activo') {
            return responder(caja('ACTIVO', ['✧ Tu subbot ya está encendido.']));
        }
        if (resultado === 'pendiente') {
            return responder(caja('PENDIENTE', ['✧ Tu subbot todavía no está vinculado.', '✦ Escribe .code para pedir un código nuevo.']));
        }
        if (resultado === 'cerrada') {
            return responder(caja('SESIÓN CERRADA', [
                '✧ Tu sesión de WhatsApp se cerró, por eso no se puede reactivar.',
                '✦ Escribe .code para vincular un subbot nuevo.'
            ]));
        }
        return responder(caja('REACTIVADO', [
            '✧ Tu subbot se está encendiendo.',
            '✦ En unos segundos ya debe estar en línea.'
        ]));
    }
};
