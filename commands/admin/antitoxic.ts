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

const MAX_ADVERTENCIAS = 3;
const MINUTOS_SILENCIO = 10;
const MAX_PALABRAS_EXTRA = 100;

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

/** Quita acentos, pasa a minúsculas y reduce letras repetidas (3 o más seguidas -> 1). */
const normalizar = (t: string) => t
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/(.)\1{2,}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

// La lista base también se normaliza, para que compare igual que el texto
const BASE = PALABRAS.map(normalizar).filter(Boolean);

/** Compara un texto contra una lista de palabras y frases ya normalizadas. */
const contiene = (texto: string, lista: string[]): boolean => {
    const palabras = normalizar(texto).split(/[^a-z0-9ñ ]+/).join(' ').split(/\s+/).filter(Boolean);
    const unido = ' ' + palabras.join(' ') + ' ';
    return lista.some((p) => p.includes(' ') ? unido.includes(' ' + p + ' ') : palabras.includes(p));
};

/** Palabras extra de cada grupo, guardadas en la base de datos. */
const extrasDe = (chatDb: any): string[] =>
    (chatDb?.palabrasToxicas || []).map((p: string) => normalizar(p)).filter(Boolean);

/** ¿El texto trae una grosería de la lista base o de las palabras del grupo? */
export const tieneGrosería = (texto: string, chatDb?: any): boolean =>
    contiene(texto, [...BASE, ...extrasDe(chatDb)]);

const quitarEtiqueta = (jid: string) => `@${jid.split('@')[0]}`;

export default {
    command: ['antitoxic', 'antitoxico'],
    description: 'Borra groserías, avisa con advertencias y silencia al 3º aviso',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,

    run: async (ctx: any) => {
        const { chat, m, args, usedPrefix, command } = ctx;
        const reply = (txt: string) => m.reply ? m.reply(txt) : ctx.sock.sendMessage(chat, { text: txt }, { quoted: m });

        if (!global.db?.data) return reply('✿ Error: DB no inicializada.');
        if (!global.db.data.chats) global.db.data.chats = {};
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {};

        const chatDb = global.db.data.chats[chat];
        const input = args[0]?.toLowerCase();
        const resto = args.slice(1).join(' ').trim();
        const estado = chatDb.antitoxic ? 'Activado ✓' : 'Desactivado ✗';
        const p = usedPrefix + command;

        if (!input) {
            return reply(caja('ANTITOXIC', [
                `✧ Activar » *${p} on*`,
                `✧ Desactivar » *${p} off*`,
                `✧ Agregar palabra » *${p} add <palabra>*`,
                `✧ Quitar palabra » *${p} del <palabra>*`,
                `✧ Ver palabras » *${p} lista*`,
                `✦ Estado » *${estado}*`,
                `✦ ${MAX_ADVERTENCIAS} advertencias y silencio de ${MINUTOS_SILENCIO} min.`
            ]));
        }

        if (['on', '1', 'enable', 'activar'].includes(input)) {
            chatDb.antitoxic = true;
            saveDB(chat);
            return reply(caja('ANTITOXIC', ['✓ Activado.', `✦ ${MAX_ADVERTENCIAS} advertencias y silencio de ${MINUTOS_SILENCIO} min.`]));
        }

        if (['off', '0', 'disable', 'desactivar'].includes(input)) {
            chatDb.antitoxic = false;
            saveDB(chat);
            return reply(caja('ANTITOXIC', ['✗ Desactivado.']));
        }

        if (['add', 'agregar', 'añadir', 'anadir'].includes(input)) {
            const nueva = normalizar(resto);
            if (!nueva) return reply(caja('ANTITOXIC', [`✧ Escribe la palabra: *${p} add <palabra>*`]));
            if (nueva.length > 40) return reply(caja('ANTITOXIC', ['✧ La palabra es muy larga (máx. 40 letras).']));
            chatDb.palabrasToxicas = chatDb.palabrasToxicas || [];
            if (extrasDe(chatDb).includes(nueva) || BASE.includes(nueva)) {
                return reply(caja('ANTITOXIC', [`✧ *${nueva}* ya está en la lista.`]));
            }
            if (chatDb.palabrasToxicas.length >= MAX_PALABRAS_EXTRA) {
                return reply(caja('ANTITOXIC', [`✧ Ya hay ${MAX_PALABRAS_EXTRA} palabras propias. Quita alguna primero.`]));
            }
            chatDb.palabrasToxicas.push(nueva);
            saveDB(chat);
            return reply(caja('ANTITOXIC', [`✓ Agregada » *${nueva}*`, `✦ Total propias » ${chatDb.palabrasToxicas.length}`]));
        }

        if (['del', 'quitar', 'eliminar', 'borrar'].includes(input)) {
            const quitar = normalizar(resto);
            if (!quitar) return reply(caja('ANTITOXIC', [`✧ Escribe la palabra: *${p} del <palabra>*`]));
            const lista = chatDb.palabrasToxicas || [];
            if (!lista.map(normalizar).includes(quitar)) {
                return reply(caja('ANTITOXIC', [`✧ *${quitar}* no está en las palabras del grupo.`]));
            }
            chatDb.palabrasToxicas = lista.filter((x: string) => normalizar(x) !== quitar);
            saveDB(chat);
            return reply(caja('ANTITOXIC', [`✗ Quitada » *${quitar}*`]));
        }

        if (['lista', 'list', 'ver'].includes(input)) {
            const propias = chatDb.palabrasToxicas || [];
            return reply(caja('ANTITOXIC', [
                `✦ Base » ${BASE.length} palabras`,
                `✦ Propias » ${propias.length ? propias.join(', ') : 'ninguna'}`
            ]));
        }

        return reply(caja('ANTITOXIC', [`✧ No entendí. Usa *${p}* para ver las opciones.`]));
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

        const quien = m.sender;
        const texto = (m.text || m.caption || m.body || '').toString();

        // Silenciado: se borran todos sus mensajes hasta que pase el tiempo
        const hasta = chatDb.silenciados?.[quien];
        if (hasta) {
            if (Date.now() < hasta) {
                try { await sock.sendMessage(m.chat, { delete: m.key }); } catch (e) { console.log('[ANTITOXIC] Error:', e); }
                return true;
            }
            delete chatDb.silenciados[quien];
            saveDB(m.chat);
        }

        if (!texto || !tieneGrosería(texto, chatDb)) return false;

        try {
            await sock.sendMessage(m.chat, { delete: m.key });
            const etiqueta = quitarEtiqueta(quien);

            chatDb.advertenciasToxicas = chatDb.advertenciasToxicas || {};
            const total = (chatDb.advertenciasToxicas[quien] || 0) + 1;

            // Tercera advertencia: silencio y el contador se reinicia
            if (total >= MAX_ADVERTENCIAS) {
                delete chatDb.advertenciasToxicas[quien];
                chatDb.silenciados = chatDb.silenciados || {};
                chatDb.silenciados[quien] = Date.now() + MINUTOS_SILENCIO * 60 * 1000;
                saveDB(m.chat);
                await sock.sendMessage(m.chat, {
                    text: caja('ANTITOXIC', [
                        `✧ ${etiqueta} llegó a ${MAX_ADVERTENCIAS}/${MAX_ADVERTENCIAS} advertencias.`,
                        `✦ Silenciado por ${MINUTOS_SILENCIO} minutos.`
                    ]),
                    mentions: [quien]
                });
                return true;
            }

            chatDb.advertenciasToxicas[quien] = total;
            saveDB(m.chat);
            const restantes = MAX_ADVERTENCIAS - total;
            await sock.sendMessage(m.chat, {
                text: caja('ADVERTENCIA', [
                    `✧ ${etiqueta} no digas groserías.`,
                    `✦ Advertencia » *${total}/${MAX_ADVERTENCIAS}*`,
                    `✦ Te quedan ${restantes} ${restantes === 1 ? 'advertencia' : 'advertencias'} antes del silencio.`
                ]),
                mentions: [quien]
            });
            return true;
        } catch (e) {
            console.log('[ANTITOXIC] Error:', e);
            return false;
        }
    }
};
