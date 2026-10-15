import { saveDB } from '#db';

// Palabras que se borran. Se comparan en minúsculas, sin acentos y con letras repetidas reducidas
// (así "PUUUTA" cuenta como "puta"). Se puede ampliar la lista aquí.
const PALABRAS = [
    'puta', 'puto', 'putas', 'putos', 'putazo', 'hdp', 'putamadre', 'putamadres', 'hijueputa', 'hijoputa', 'hijodeputa',
    'mierda', 'mierdas', 'carajo', 'carajos', 'verga', 'vergas', 'pendejo', 'pendeja', 'pendejos', 'pendejas',
    'cabron', 'cabrona', 'cabrones', 'chingar', 'chingada', 'chingado', 'chingon', 'chinga', 'pinche', 'pinches',
    'culero', 'culera', 'cojudo', 'cojuda', 'boludo', 'boluda', 'gilipollas', 'mamon', 'mamona',
    'zorra', 'zorras', 'perra', 'perras', 'conchatumare', 'conchatumadre', 'ctm', 'csm', 'mrd',
    'maricon', 'maricones', 'marica', 'joder', 'jodete', 'imbecil', 'imbeciles'
];

/** Quita acentos, pasa a minúsculas y reduce letras repetidas (3 o más seguidas -> 1). */
const normalizar = (t: string) => t
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/(.)\1{2,}/g, '$1');

// La lista también se normaliza, para que compare igual que el texto
const CONJUNTO = new Set(PALABRAS.map(normalizar));

/** ¿El texto trae alguna palabra de la lista? */
export const tieneGrosería = (texto: string): boolean => {
    const palabras = normalizar(texto).split(/[^a-z]+/).filter(Boolean);
    return palabras.some((p) => CONJUNTO.has(p));
};

export default {
    command: ['antitoxic', 'antitoxico'],
    description: 'Borra las groserías del grupo (sin advertencias)',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,

    run: async (ctx) => {
        const { chat, m, args, usedPrefix, command } = ctx;
        const reply = (txt) => m.reply ? m.reply(txt) : ctx.sock.sendMessage(chat, { text: txt }, { quoted: m });

        if (!global.db?.data) return reply('✿ Error: DB no inicializada.');
        if (!global.db.data.chats) global.db.data.chats = {};
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {};

        const chatDb = global.db.data.chats[chat];
        const input = args[0]?.toLowerCase();
        const estado = chatDb.antitoxic ? 'Activado ✓' : 'Desactivado ✗';

        if (!input) {
            return reply(
                `˚₊· ͟͟͞͞➳❥ *ANTITOXIC*\n───────────────\n` +
                `✧ Activar » *${usedPrefix + command} on*\n` +
                `✧ Desactivar » *${usedPrefix + command} off*\n` +
                `✦ Estado » *${estado}*\n` +
                `✦ Borra el mensaje con groserías. Sin advertencias.\n` +
                `───────────────\n> AKAME-MD 🌸`
            );
        }

        if (['on', '1', 'enable', 'activar'].includes(input)) {
            chatDb.antitoxic = true;
            saveDB(chat);
            return reply(`✓ *Antitoxic ACTIVADO*\n> Se borrarán las groserías de los miembros.`);
        }

        if (['off', '0', 'disable', 'desactivar'].includes(input)) {
            chatDb.antitoxic = false;
            saveDB(chat);
            return reply(`✗ *Antitoxic DESACTIVADO*`);
        }
    },

    before: async function (ctx: any) {
        const { sock, m, isGroup, isAdmin, isBotAdmin, isOwner } = ctx;
        if (!isGroup) return false;

        const chatDb = global.db?.data?.chats?.[m.chat];
        if (!chatDb?.antitoxic) return false;

        // Admins y dueño no se revisan
        if (isAdmin || isOwner) return false;
        // Sin permisos de admin el bot no puede borrar mensajes de otros
        if (!isBotAdmin) return false;

        const texto = (m.text || m.caption || m.body || '').toString();
        if (!texto || !tieneGrosería(texto)) return false;

        try {
            await sock.sendMessage(m.chat, { delete: m.key });
            return true;
        } catch (e) {
            console.log('[ANTITOXIC] Error:', e);
            return false;
        }
    }
};
