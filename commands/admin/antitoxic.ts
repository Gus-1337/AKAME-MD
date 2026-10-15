import { saveDB } from '#db';

// Palabras que se borran. Se comparan en minúsculas, sin acentos y con letras repetidas reducidas
// (así "PUUUTA" cuenta como "puta"). Se puede ampliar la lista aquí.
const PALABRAS = [
    // Español general
    'puta', 'puto', 'putas', 'putos', 'putazo', 'putada', 'putamadre', 'putamadres', 'putita', 'putito',
    'hdp', 'hijueputa', 'hijueputas', 'hijoputa', 'hijoputas', 'hijodeputa', 'hijaputa', 'hijoeputa', 'hijueperra',
    'mierda', 'mierdas', 'mierdero', 'carajo', 'carajos', 'carajeada', 'mrd', 'ctm', 'csm', 'conchatumare', 'conchatumadre', 'conchetumare', 'conchetumadre', 'conchesumadre',
    'verga', 'vergas', 'vergudo', 'vergazo', 'pendejo', 'pendeja', 'pendejos', 'pendejas', 'pendejada', 'pendejadas', 'pendejito',
    'cabron', 'cabrona', 'cabrones', 'cabronazo', 'chingar', 'chingado', 'chingada', 'chingados', 'chingadas', 'chingon', 'chingona', 'chingones',
    'chinga', 'chingas', 'chingadera', 'chingaderas', 'pinche', 'pinches', 'pinchi', 'pinshi',
    'culero', 'culera', 'culeros', 'culeras', 'culo', 'culos', 'culazo', 'cojudo', 'cojuda', 'cojudos', 'cojudez',
    'joder', 'jodete', 'jodido', 'jodida', 'imbecil', 'imbeciles', 'idiota', 'idiotas', 'estupido', 'estupida', 'estupidos',
    'maricon', 'maricones', 'marica', 'mariconazo', 'puñal', 'puñeta', 'puñetero', 'puñetera', 'pinchepuñal',
    'gilipollas', 'gilipolla', 'capullo', 'capulla', 'coñazo', 'coñeta',
    'zorra', 'zorras', 'zorron', 'perra', 'perras', 'malparido', 'malparida', 'malparidos',
    'mamon', 'mamona', 'mamones', 'mamonazo', 'mamada', 'mamadas', 'mames', 'mamaguevo', 'mamagüevo',
    'guevon', 'guevona', 'guevón', 'guevones', 'huevon', 'huevona', 'huevones', 'webon', 'weon', 'weona', 'weones', 'weá', 'weta', 'wevon',
    'pelotudo', 'pelotudos', 'pelotudez', 'boludo', 'boluda', 'boludos', 'boludez', 'forro', 'forros', 'forra',
    'pija', 'pijas', 'conchuda',
    'culiao', 'culiado', 'culiaos', 'culiadas', 'qliao', 'culiá', 'chupame', 'chupamela', 'chupapolla', 'chupamedias', 'chupamepija',
    'gonorrea', 'gonorreas', 'pirobo', 'piroba', 'pirobos', 'ojete', 'ojetes', 'joto', 'jotos', 'puñete',
    'tarado', 'tarada', 'baboso', 'pendejazo', 'mames', 'mamés', 'panocha', 'panochas', 'cagon', 'cagona', 'cabronada',
    'putazos',
    'imbecil', 'retrasado', 'retrasada', 'pinche', 'pendeja',
    // Argentina, Uruguay, Paraguay
    'forro', 'chota', 'chotas', 'cagon', 'boludazo', // Chile
    'culiaaa', 'conchetumadre', 'weon', 'weona', 'weones', 'hueon', 'hueona', 'culiao', // Colombia, Venezuela, Ecuador, Centroamérica
    'hijueputa', 'malparido', 'marica', 'gonorrea', 'berraco', 'hp', 'careverga', 'carepicha', 'carepinga', 'marico', 'maricon', 'mamaguevo', 'guevon', 'coñoemadre', 'pendejo', 'pendeja', 'mamagallo', 'mamahuevo', 'mamon',
    // Inglés
    'fuck', 'fucks', 'fucked', 'fucker', 'fuckers', 'fucking', 'fuckin', 'fck', 'fuk', 'fukin', 'motherfucker', 'motherfuckers', 'mf', 'shit', 'shits', 'shitty', 'bullshit', 'bitch', 'bitches', 'bitchy',
    'bastard', 'bastards', 'asshole', 'assholes', 'dick', 'dicks', 'dickhead', 'cocks', 'cocksucker', 'pussy', 'pussies', 'cunt', 'cunts', 'whore', 'whores', 'slut', 'sluts',
    'dumbass', 'retard', 'retarded', 'nigga', 'niggas', 'nigger', 'niggers', 'faggot', 'faggots', 'fag', 'fags', 'wanker', 'twat', 'prick', 'skank', 'bollocks', 'tits', 'jerkoff', 'jackass', 'douche', 'douchebag', 'scumbag', 'tranny', // Portugués (Brasil y Portugal)
    'caralho', 'caralha', 'foda', 'fodase', 'foder', 'fodido', 'fodida', 'merda', 'buceta', 'bosta', 'viado', 'viados', 'veado', 'otario', 'otaria', 'arrombado', 'arrombada',
    'puta', 'punheta', 'cuzao', 'cuzão', 'filhodaputa', 'babaca', 'piranha', 'safada',
    // Francés
    'merde', 'putain', 'connard', 'connasse', 'salope', 'enculé', 'encule', 'pute', 'putes', 'nique', 'niquer', 'batard', 'batarde', // Italiano
    'cazzo', 'cazzi', 'stronzo', 'stronza', 'vaffanculo', 'coglione', 'coglioni', 'minchia', 'troia', 'puttana', // Alemán
    'scheisse', 'scheiße', 'arschloch', 'fick', 'ficken', 'hurensohn', 'wichser', 'schlampe', 'fotze', 'bastard',
    // Ruso (transliterado)
    'blyat', 'blyad', 'suka', 'pizda', 'pizdec', 'ebat', 'nahui', 'mudak'
];

/** Quita acentos, pasa a minúsculas y reduce letras repetidas (3 o más seguidas -> 1). */
const normalizar = (t: string) => t
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/(.)\1{2,}/g, '$1');

// La lista también se normaliza, para que compare igual que el texto
const LISTA = PALABRAS.map(normalizar);
const CONJUNTO = new Set(LISTA.filter((p) => !p.includes(' ')));
const FRASES = LISTA.filter((p) => p.includes(' '));

/** ¿El texto trae alguna palabra o frase de la lista? */
export const tieneGrosería = (texto: string): boolean => {
    const palabras = normalizar(texto).split(/[^a-z ]+/).join(' ').split(/\s+/).filter(Boolean);
    if (palabras.some((p) => CONJUNTO.has(p))) return true;
    const unido = ' ' + palabras.join(' ') + ' ';
    return FRASES.some((f) => unido.includes(' ' + f + ' '));
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
