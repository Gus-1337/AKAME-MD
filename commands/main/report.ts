import config from '#config';

/** Grupo donde llegan las sugerencias y los reportes. */
const GRUPO_REPORTES = '120363429023932239@g.us';

const ESPERA_MS = 2 * 60 * 1000;
const MAX_CARACTERES = 1000;
const usos: Map<string, number> = (globalThis as any).reportUsos || ((globalThis as any).reportUsos = new Map());

export default {
    command: ['report', 'reporte'],
    description: 'Reporta un comando que no funciona o está fallando',
    category: 'main',
    run: async ({ sock, msg, chat, args, sender, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: msg });
        const texto = (args || []).join(' ').trim();

        if (!texto) {
            return reply(
                `˚₊· ͟͟͞͞➳❥ *REPORTE* ✦\n\n` +
                `✧ Uso › *${p}report <comando> <qué pasa>*\n` +
                `✩ Ejemplo › *${p}report ${p}pk no responde*\n\n` +
                `> Cuéntanos qué comando falla y qué ves`
            );
        }
        if (texto.length > MAX_CARACTERES) return reply(`「 ꕤ 」 Tu reporte es muy largo (máximo ${MAX_CARACTERES} caracteres).`);

        const quien = sender || msg.key?.participant || chat;
        const ahora = Date.now();
        const ultimo = usos.get(quien) || 0;
        if (ahora - ultimo < ESPERA_MS) {
            const falta = Math.ceil((ESPERA_MS - (ahora - ultimo)) / 1000);
            return reply(`「 ꕤ 」 Espera *${falta}s* antes de mandar otro reporte.`);
        }

        const nombre = msg.pushName || 'Usuario';
        const numero = String(quien).split('@')[0].split(':')[0];
        const origen = chat.endsWith('@g.us') ? 'Grupo' : 'Privado';

        try {
            await sock.sendMessage(GRUPO_REPORTES, {
                text:
                    `˚₊· ͟͟͞͞➳❥ *REPORTE DE ERROR* ✦\n\n` +
                    `   ✧ De › *${nombre}* (@${numero})\n` +
                    `   ✩ Desde › ${origen}\n\n` +
                    `   🐞 ${texto}`,
                mentions: [quien]
            });
            usos.set(quien, ahora);
            return reply(`˚₊· ͟͟͞͞➳❥ *ENVIADO* ✦\n\n   ✅ Gracias, tu reporte llegó al equipo.`);
        } catch (e) {
            console.error('Error en report:', e);
            return reply('「 ꕤ 」 No pude enviar tu reporte, intenta más tarde.');
        }
    }
};
