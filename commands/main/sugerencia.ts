import config from '#config';

/** Grupo donde llegan las sugerencias y los reportes. */
const GRUPO_REPORTES = '120363412261204126@g.us';

const ESPERA_MS = 2 * 60 * 1000;
const MAX_CARACTERES = 1000;
const usos: Map<string, number> = (globalThis as any).sugUsos || ((globalThis as any).sugUsos = new Map());

export default {
    command: ['sug', 'sugerencia'],
    description: 'Envía una sugerencia de nuevas funciones o comandos al equipo',
    category: 'main',
    run: async ({ sock, msg, chat, args, sender, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: msg });
        const texto = (args || []).join(' ').trim();

        if (!texto) {
            return reply(
                `˚₊· ͟͟͞͞➳❥ *SUGERENCIA* ✦\n\n` +
                `✧ Uso › *${p}sug <tu idea>*\n` +
                `✩ Ejemplo › *${p}sug agreguen un comando de clima*\n\n` +
                `> Tu mensaje llega al equipo del bot`
            );
        }
        if (texto.length > MAX_CARACTERES) return reply(`「 ꕤ 」 Tu sugerencia es muy larga (máximo ${MAX_CARACTERES} caracteres).`);

        const quien = sender || msg.key?.participant || chat;
        const ahora = Date.now();
        const ultimo = usos.get(quien) || 0;
        if (ahora - ultimo < ESPERA_MS) {
            const falta = Math.ceil((ESPERA_MS - (ahora - ultimo)) / 1000);
            return reply(`「 ꕤ 」 Espera *${falta}s* antes de mandar otra sugerencia.`);
        }

        const nombre = msg.pushName || 'Usuario';
        const numero = String(quien).split('@')[0].split(':')[0];
        const origen = chat.endsWith('@g.us') ? 'Grupo' : 'Privado';

        try {
            await sock.sendMessage(GRUPO_REPORTES, {
                text:
                    `˚₊· ͟͟͞͞➳❥ *SUGERENCIA* ✦\n\n` +
                    `   ✧ De › *${nombre}* (@${numero})\n` +
                    `   ✩ Desde › ${origen}\n\n` +
                    `   💡 ${texto}`,
                mentions: [quien]
            });
            usos.set(quien, ahora);
            return reply(`˚₊· ͟͟͞͞➳❥ *ENVIADA* ✦\n\n   ✅ Gracias, tu sugerencia llegó al equipo.`);
        } catch (e) {
            console.error('Error en sug:', e);
            return reply('「 ꕤ 」 No pude enviar tu sugerencia, intenta más tarde.');
        }
    }
};
