import { asignarPrimario, quitarPrimario } from '#primario';
import { listarSubbots } from '../../lib/subbots.ts';
import { UserJid } from '#simple';

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

// Igual que el handler: se corta antes de @ y : (así no se pega el número de dispositivo, ej. ":12")
const soloDigitos = (texto: string) => String(texto || '').split('@')[0].split(':')[0].replace(/\D/g, '');

export default {
    command: ['setprimary'],
    description: 'Elige qué bot responde comandos en este grupo (si hay varios bots)',
    category: 'owner',
    group: true,
    owner: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const responder = (texto: string) => sock.sendMessage(chat, { text: texto }, { quoted: msg });

        // Número de este bot (principal o subbot)
        const yo = soloDigitos(sock.user?.id || '');
        const esSubbot = !!(global as any).esSubbot;
        const accion = String(args?.[0] || '').toLowerCase();

        // Mensaje citado: al responder a un mensaje de un bot, el autor de ese mensaje es el elegido
        const m = ctx.m ?? msg;
        const ctxInfo = m?.message?.extendedTextMessage?.contextInfo || m?.message?.contextInfo || msg?.message?.extendedTextMessage?.contextInfo;
        const citado = ctxInfo?.participant || '';
        const mencion = ctxInfo?.mentionedJid?.[0] || m?.mentionedJid?.[0];

        // Sin argumentos ni mención ni respuesta: la explicación la da solo el bot principal
        if (!accion && !mencion && !citado) {
            if (esSubbot) return;
            return responder(caja('BOT PRIMARIO', [
                `✧ Usa *${usedPrefix}setprimary <número del bot>*`,
                `✦ Para quitarlo: *${usedPrefix}setprimary off*`,
                '✦ Con un bot primario, solo ese responde comandos en el grupo.'
            ]));
        }

        // Quitar el primario: lo puede procesar cualquier bot vivo; solo responde el principal
        if (accion === 'off' || accion === 'quitar') {
            quitarPrimario(chat);
            if (esSubbot) return;
            return responder(caja('BOT PRIMARIO', ['✧ Quitado. Ahora responden todos los bots del grupo.']));
        }

        // Asignar: cada bot compara el número con el suyo; solo el elegido confirma
        // Puede venir como mención (@bot) o como número. La mención real trae el JID en mentionedJid;
        // el texto "@AKAME" no sirve, por eso se lee de ahí.
        // Prioridad: mención, luego mensaje citado, luego número escrito
        let objetivo = String(args?.[0] || '').replace(/\D/g, '');
        const referencia = mencion || citado;
        if (referencia) {
            try {
                objetivo = soloDigitos(await UserJid(sock, chat, referencia)) || soloDigitos(referencia);
            } catch {
                objetivo = soloDigitos(referencia);
            }
        }
        if (!objetivo) {
            if (esSubbot) return;
            return responder(caja('BOT PRIMARIO', ['✧ Menciona al bot, responde a un mensaje suyo o escribe su número.', `✦ Ejemplo: *${usedPrefix}setprimary @bot*`]));
        }

        const soyElegido = yo === objetivo;
        const esSubbotConectado = listarSubbots().some((s) => s.estado === 'conectado' && s.numero === objetivo);

        // Número que no es de ningún bot conectado: lo informa el principal y no se guarda nada
        if (!soyElegido && !esSubbotConectado) {
            if (!esSubbot) return responder(caja('BOT PRIMARIO', ['✧ Ese número no es un bot conectado.', '✦ Revisa con *.bots*.']));
            return;
        }

        // Cada bot que recibe el comando guarda lo mismo (es idempotente); solo el elegido confirma
        asignarPrimario(chat, objetivo);
        if (soyElegido) {
            const jid = `${yo}@s.whatsapp.net`;
            return sock.sendMessage(chat, {
                text: `ꕥ Se ha establecido a @${yo} como bot primario de este grupo.\n\n> Ahora todos los comandos de este grupo serán ejecutados por @${yo}.`,
                mentions: [jid]
            }, { quoted: msg });
        }
    }
};
