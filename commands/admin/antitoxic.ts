import { saveDB } from '#db';

/**
 * Lista base de groserías. Son palabras inequívocas: se evitan las que tienen un
 * uso inocente ("pedo" = borracho, "concha" = molusco, "coger" = agarrar) para no
 * borrar mensajes normales. Cada grupo puede ampliarla con `.antitoxic add <palabra>`.
 */
export const GROSERIAS_BASE = [
    'puta', 'puto', 'putas', 'putos', 'putita', 'putito', 'ptm', 'putamadre',
    'mierda', 'mierdas', 'joder', 'jodete', 'jodido', 'jodida',
    'pendejo', 'pendeja', 'pendejos', 'pendejas',
    'cabron', 'cabrona', 'cabrones', 'hijueputa', 'hijoeputa',
    'malparido', 'malparida', 'gonorrea', 'gonorea',
    'verga', 'vergas', 'pinga', 'pichula',
    'conchetumadre', 'ctm', 'chetumadre',
    'maricon', 'maricona', 'marico',
    'culiao', 'culiada', 'pajero', 'pajera',
    'boludo', 'boluda', 'forro', 'forra',
    'imbecil', 'estupido', 'estupida', 'idiota',
    'fuck', 'shit', 'bitch', 'asshole'
] as const;

const NORMALIZAR = (t: string): string =>
    t
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/0/g, 'o')
        .replace(/1/g, 'i')
        .replace(/3/g, 'e')
        .replace(/4/g, 'a')
        .replace(/@/g, 'a')
        .replace(/[_\-\.]+/g, ' ')
        .replace(/\s+/g, ' ');

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Arma el regex de detección. Cada palabra va como palabra completa: "puto" no
 * debe saltar dentro de "computadora" ni "disputo".
 */
export const buildToxicRegex = (extra: string[] = []): RegExp => {
    const palabras = [...GROSERIAS_BASE, ...extra.map((w) => NORMALIZAR(String(w)).trim())].filter(Boolean);
    const unicas = [...new Set(palabras)];
    const alts = unicas.map((w) => {
        const e = escapeRegex(w);
        const soloLetras = /^[\p{L}]+$/u.test(w);
        return soloLetras ? `\\b${e}\\b` : `(?<![\\p{L}\\p{N}])${e}(?![\\p{L}\\p{N}])`;
    });
    return new RegExp(alts.join('|'), 'iu');
};

const ensureChat = (chat: string) => {
    if (!(global as any).db?.data) return null;
    if (!(global as any).db.data.chats) (global as any).db.data.chats = {};
    if (!(global as any).db.data.chats[chat]) (global as any).db.data.chats[chat] = {};
    const c = (global as any).db.data.chats[chat];
    c.antitoxic ??= false;
    c.toxicwords ??= [];
    return c;
};

export default {
    command: ['antitoxic', 'antitoxico', 'antigroserias'],
    description: 'Borra mensajes con groserías en el grupo',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,

    run: async (ctx: any) => {
        const { chat, m, args, usedPrefix, prefix, command } = ctx;
        const p = usedPrefix || prefix || '.';
        const reply = (txt: string) =>
            m?.reply ? m.reply(txt) : ctx.sock.sendMessage(chat, { text: txt }, { quoted: m });

        const chatDb = ensureChat(chat);
        if (!chatDb) return reply('✿ Error: DB no inicializada.');

        const input = args[0]?.toLowerCase();
        const estado = chatDb.antitoxic ? 'Activado ✓' : 'Desactivado ✗';
        const propias: string[] = Array.isArray(chatDb.toxicwords) ? chatDb.toxicwords : [];

        if (!input) {
            return reply(
                `*— ANTITOXIC —*\n\n` +
                `✐ Activar » *${p}${command} on*\n` +
                `✐ Desactivar » *${p}${command} off*\n` +
                `✐ Agregar palabra » *${p}${command} add <palabra>*\n` +
                `✐ Quitar palabra » *${p}${command} del <palabra>*\n\n` +
                `✦ Estado: *${estado}*\n` +
                `✦ Palabras base: *${GROSERIAS_BASE.length}*\n` +
                `✦ Agregadas acá: *${propias.length}*${propias.length ? `\n> ${propias.join(', ')}` : ''}\n\n` +
                `> Borro el mensaje de quien mande una grosería. Admins y el owner se salvan.`
            );
        }

        if (['on', '1', 'enable', 'activar'].includes(input)) {
            chatDb.antitoxic = true;
            saveDB(chat);
            return reply(
                `✓ *AntiToxic ACTIVADO*\n` +
                `> ${GROSERIAS_BASE.length + propias.length} palabras vigiladas.\n` +
                `> Para agregar una: *${p}${command} add <palabra>*`
            );
        }

        if (['off', '0', 'disable', 'desactivar'].includes(input)) {
            chatDb.antitoxic = false;
            saveDB(chat);
            return reply('✗ *AntiToxic DESACTIVADO*');
        }

        if (['add', 'agregar', 'añadir', 'suma'].includes(input)) {
            const palabra = NORMALIZAR(args.slice(1).join(' ')).trim();
            if (!palabra) return reply(`✿ Falta la palabra\n> *${p}${command} add <palabra>*`);
            if (palabra.length > 40) return reply('✿ Muy larga, máximo 40 caracteres.');
            if ((GROSERIAS_BASE as readonly string[]).includes(palabra)) {
                return reply(`✿ *${palabra}* ya está en la lista base, no hace falta agregarla.`);
            }
            if (propias.includes(palabra)) return reply(`✿ *${palabra}* ya estaba agregada.`);
            propias.push(palabra);
            chatDb.toxicwords = propias;
            saveDB(chat);
            return reply(`✓ *${palabra}* agregada\n> Ahora hay ${GROSERIAS_BASE.length + propias.length} palabras vigiladas.`);
        }

        if (['del', 'remove', 'quitar', 'borrar'].includes(input)) {
            const palabra = NORMALIZAR(args.slice(1).join(' ')).trim();
            if (!palabra) return reply(`✿ Falta la palabra\n> *${p}${command} del <palabra>*`);
            const i = propias.indexOf(palabra);
            if (i === -1) return reply(`✿ *${palabra}* no está en las agregadas.\n> Las de la lista base no se pueden quitar.`);
            propias.splice(i, 1);
            chatDb.toxicwords = propias;
            saveDB(chat);
            return reply(`✓ *${palabra}* quitada`);
        }

        return reply(`✿ Opción no reconocida: *${input}*\n> Usa *${p}${command}* para ver las opciones.`);
    },

    before: async (ctx: any) => {
        const { sock, m, chat, isGroup, isAdmin, isBotAdmin, isOwner } = ctx;
        if (!isGroup) return false;

        const chatDb = (global as any).db?.data?.chats?.[chat];
        if (!chatDb?.antitoxic) return false;
        if (!isBotAdmin) return false;
        if (isOwner || isAdmin) return false;
        if (!m?.key || m.key.fromMe) return false;

        const texto = String(m.text || m.body || m.caption || '');
        if (!texto.trim()) return false;

        const propias: string[] = Array.isArray(chatDb.toxicwords) ? chatDb.toxicwords : [];
        const regex = buildToxicRegex(propias);
        const hallado = regex.exec(NORMALIZAR(texto));
        if (!hallado) return false;

        try {
            await sock.sendMessage(chat, { delete: m.key });
            await sock.sendMessage(chat, {
                text:
                    `*ANTITOXIC* 🤐 @${String(m.sender).split('@')[0]} ` +
                    `borrado por decir *${hallado[0]}*\n` +
                    `> Acá se habla bonito.`,
                mentions: [m.sender]
            });
            return true;
        } catch (e) {
            console.log('[ANTITOXIC] Error:', e);
            return false;
        }
    }
};
