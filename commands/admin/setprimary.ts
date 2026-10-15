import { asignarPrimario, quitarPrimario } from '#primario';
import { listarSubbots } from '../../lib/subbots.ts';

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

// Igual que el handler: se corta antes de @ y : (así no se pega el número de dispositivo, ej. ":12")
const soloDigitos = (texto: string) => String(texto || '').split('@')[0].split(':')[0].replace(/\D/g, '');

export default {
    command: ['setprimary'],
    description: 'Elige qué bot responde comandos en este grupo (si hay varios bots)',
    category: 'admin',
    group: true,
    admin: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args, usedPrefix } = ctx;
        const responder = (texto: string) => sock.sendMessage(chat, { text: texto }, { quoted: msg });

        // Número de este bot (principal o subbot)
        const yo = soloDigitos(sock.user?.id || '');
        const esSubbot = !!(global as any).esSubbot;
        const accion = String(args?.[0] || '').toLowerCase();

        // Sin argumentos: la explicación la da solo el bot principal, para no repetirla en cada subbot
        if (!accion) {
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
        const objetivo = String(args[0]).replace(/\D/g, '');
        if (!objetivo) return;

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
            return responder(caja('BOT PRIMARIO', [
                '✧ Ahora soy el bot primario de este grupo.',
                '✦ Solo yo responderé comandos aquí.'
            ]));
        }
    }
};
