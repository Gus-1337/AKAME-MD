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

export default {
    command: ['code', 'vincular'],
    description: 'Crea tu subbot y te da el código para vincularlo',
    category: 'subbot',
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;

        if (String(chat).endsWith('@g.us')) {
            return sock.sendMessage(chat, {
                text: caja('SUBBOT', ['✧ Escríbeme por privado para generar tu código.'])
            }, { quoted: msg });
        }

        // Número de quien escribe; si la cuenta no muestra su número, puede escribirlo como argumento
        const numero = numeroDelRemitente(ctx) || String(args?.[0] || '').replace(/\D/g, '');
        if (!numero) {
            return sock.sendMessage(chat, {
                text: caja('SUBBOT', ['✧ No pude leer tu número.', '✦ Escribe: .code 51999999999'])
            }, { quoted: msg });
        }

        const existente = buscarSubbot(numero);
        if (existente) {
            const estados: Record<string, string> = {
                emparejando: '⏳ esperando vinculación',
                conectado: '✅ conectado',
                caido: '⚠️ caído (se está reconectando)'
            };
            return sock.sendMessage(chat, {
                text: caja('TU SUBBOT', [
                    `✧ Estado » ${estados[existente.estado] || existente.estado}`,
                    '✦ Usa .subbot para ver los datos.'
                ])
            }, { quoted: msg });
        }

        try {
            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } });
            const { codigo } = await crearSubbot(numero);

            await sock.sendMessage(chat, {
                text: caja('TU CÓDIGO', [
                    `✧ Código » *${codigo}*`,
                    '✦ Vence » en 90 segundos',
                    '',
                    '*Pasos:*',
                    '1. Abre WhatsApp en tu teléfono',
                    '2. Toca ⋮ → Dispositivos vinculados',
                    '3. Vincular con número de teléfono',
                    '4. Escribe el código de arriba'
                ])
            }, { quoted: msg });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } });
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(chat, {
                text: caja('SUBBOT', [`✧ ${e?.message || 'No se pudo crear el subbot'}`])
            }, { quoted: msg });
        }
    }
};
