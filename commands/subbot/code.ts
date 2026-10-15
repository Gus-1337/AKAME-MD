import axios from 'axios';
import { crearSubbot, buscarSubbot, borrarSubbot, esperaCodigo } from '../../lib/subbots.ts';

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

const IMAGEN_CODIGO = 'https://d0mwa043ankuvadx.public.blob.vercel-storage.com/nyx/r3hUDf8.jpeg';

const ESTADOS: Record<string, string> = {
    emparejando: '⏳ esperando vinculación',
    conectado: '✅ conectado',
    caido: '⏸️ caído (usa .reactivar en el bot principal)',
    pausado: '⏸️ pausado (usa .reactivar en el bot principal)'
};

const MSG_ESPERA = (seg: number) => caja('ESPERA', [
    '✧ Lo siento, tienes que esperar 1 minuto para usar de nuevo el comando.',
    `✦ Puedes volver a intentarlo en ${seg} s.`
]);

export default {
    command: ['code', 'vincular', 'jadibot'],
    description: 'Crea tu subbot y te envía el código de vinculación',
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
        const espera = esperaCodigo(numero);

        if (existente?.estado === 'conectado') {
            return responder(caja('TU SUBBOT', ['✧ Tu subbot ya está conectado.', '✦ Usa .subbot para ver tus datos.']));
        }
        if (existente && existente.estado !== 'emparejando') {
            return responder(caja('TU SUBBOT', [
                `✧ Estado » ${ESTADOS[existente.estado] || existente.estado}`,
                '✦ Escribe .reactivar en el bot principal para encenderlo.'
            ]));
        }
        if (espera > 0) {
            return responder(MSG_ESPERA(espera));
        }

        try {
            // Código que nunca se vinculó y ya pasó la espera: se reemplaza por uno nuevo
            if (existente) borrarSubbot(existente.id);

            await sock.sendMessage(chat, { react: { text: '⏳', key: msg.key } }).catch(() => {});
            const { codigo } = await crearSubbot(numero, chat);

            // Mismo chat donde se pidió. Primero la imagen con las instrucciones y después el código solo,
            // en su propio mensaje, para que se pueda copiar con una pulsación.
            const instrucciones = [
                '> 𝗩𝗶𝗻𝗰𝘂𝗹𝗮𝗰𝗶𝗼́𝗻 vía 𝗖𝗼𝗱𝗲',
                '',
                '✿ Usa este *código* para ser un *Sub-Bot temporal.*',
                '',
                '✿ *Pasos:*',
                '✿ Abre los *tres puntos* arriba a la derecha',
                '✿ Toca *Dispositivos vinculados*',
                '✿ Selecciona *Vincular con número de teléfono*',
                '✿ Ingresa el *código* de vinculación.'
            ].join('\n');
            try {
                // Se descarga primero y se manda el archivo, sin depender de que WhatsApp baje la URL
                const { data } = await axios.get(IMAGEN_CODIGO, { responseType: 'arraybuffer', timeout: 20000 });
                await sock.sendMessage(chat, { image: Buffer.from(data), caption: instrucciones }, { quoted: msg });
            } catch (e: any) {
                console.log('[CODE] imagen no enviada, se manda solo texto:', e?.message);
                await responder(instrucciones);
            }
            await sock.sendMessage(chat, { text: codigo });
            await sock.sendMessage(chat, { react: { text: '✅', key: msg.key } }).catch(() => {});
        } catch (e: any) {
            await sock.sendMessage(chat, { react: { text: '❌', key: msg.key } }).catch(() => {});
            await responder(caja('SUBBOT', [`✧ ${e?.message || 'No se pudo crear el subbot'}`]));
        }
    }
};
