import { crearSubbot, buscarSubbot } from '../../lib/subbots.ts';

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

/** Saca el número real de quien escribe (solo si la cuenta usa número de teléfono). */
const numeroDelRemitente = (ctx: any): string => {
    const candidatos = [
        ctx.msg?.key?.remoteJidAlt,
        ctx.msg?.key?.participantAlt,
        ctx.msg?.sender,
        ctx.sender,
        ctx.msg?.key?.participant,
        ctx.chat
    ];
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
    caido: '⚠️ caído (se está reconectando)'
};

export default {
    command: ['code', 'vincular'],
    description: 'Crea tu subbot y te envía el código de vinculación a tu WhatsApp',
    category: 'subbot',
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;
        const responder = (texto: string) => sock.sendMessage(chat, { text: texto }, { quoted: msg });

        // Número de quien escribe; si la cuenta no muestra su número, puede escribirlo como argumento
        const numero = numeroDelRemitente(ctx) || String(args?.[0] || '').replace(/\D/g, '');
        if (!numero) {
            return responder(caja('SUBBOT', ['✧ No pude leer tu número.', '✦ Escribe: .code 51999999999']));
        }

        const existente = buscarSubbot(numero);
        if (existente) {
            return responder(caja('TU SUBBOT', [
                `✧ Estado » ${ESTADOS[existente.estado] || existente.estado}`,
                '✦ Usa .subbot para ver los datos.'
            ]));
        }

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } }).catch(() => {});
            const { codigo } = await crearSubbot(numero);

            // Mismo chat donde se pidió. Primero las instrucciones y después el código solo,
            // en su propio mensaje, para que se pueda copiar con una pulsación.
            await responder(caja('TU CÓDIGO', [
                '✦ Vence » en 90 segundos',
                '',
                '*Pasos:*',
                '1. Abre WhatsApp en tu teléfono',
                '2. Toca ⋮ → Dispositivos vinculados',
                '3. Vincular con número de teléfono',
                '4. Copia el código del mensaje siguiente y pégalo'
            ]));
            await sock.sendMessage(chat, { text: codigo });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => {});
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
            await responder(caja('SUBBOT', [`✧ ${e?.message || 'No se pudo crear el subbot'}`]));
        }
    }
};
