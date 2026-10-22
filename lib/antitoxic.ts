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

export const MAX_ADVERTENCIAS = 3;
export const MINUTOS_SILENCIO = 10;
export const MAX_PALABRAS_EXTRA = 100;

/** Quita acentos, pasa a minúsculas y reduce cualquier letra repetida (así "PUUTA" = "puta"). */
export const normalizar = (t: string) => t
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/(.)\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

// La lista base también se normaliza, para que compare igual que el texto
export const BASE: string[] = [...new Set(PALABRAS.map(normalizar).filter(Boolean))];

/** Compara un texto contra una lista de palabras y frases ya normalizadas. */
const contiene = (texto: string, lista: string[]): boolean => {
    const palabras = normalizar(texto).split(/[^a-z0-9ñ ]+/).join(' ').split(/\s+/).filter(Boolean);
    const unido = ' ' + palabras.join(' ') + ' ';
    return lista.some((p) => p.includes(' ') ? unido.includes(' ' + p + ' ') : palabras.includes(p));
};

/** Palabras extra de cada grupo, guardadas en la base de datos. */
export const extrasDe = (chatDb: any): string[] =>
    (chatDb?.palabrasToxicas || []).map((p: string) => normalizar(p)).filter(Boolean);

/** ¿El texto trae una grosería de la lista base o de las palabras del grupo? */
export const tieneGrosería = (texto: string, chatDb?: any): boolean =>
    contiene(texto, [...BASE, ...extrasDe(chatDb)]);

const etiqueta = (jid: string) => `@${String(jid).split('@')[0]}`;

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

/**
 * Revisa un mensaje de grupo. Se llama desde handler.ts, igual que el mute,
 * con el mensaje original (rawMsg). Devuelve true si el mensaje se manejó (se borró o es de alguien silenciado).
 */
export async function procesarAntitoxic(sock: any, rawMsg: any, chat: string, quien: string, texto: string, flags: { isAdmin: boolean; isOwner: boolean; isBotAdmin: boolean }): Promise<boolean> {
    const chatDb = (global as any).db?.data?.chats?.[chat];
    if (!chatDb?.antitoxic) return false;
    // Admins y dueño no se revisan
    if (flags.isAdmin || flags.isOwner) return false;
    // Sin permisos de admin el bot no puede borrar mensajes de otros
    if (!flags.isBotAdmin || !rawMsg?.key) return false;

    // Silenciado: se borran todos sus mensajes hasta que pase el tiempo
    const hasta = chatDb.silenciados?.[quien];
    if (hasta) {
        if (Date.now() < hasta) {
            await sock.sendMessage(chat, { delete: rawMsg.key }).catch((e: any) => console.log('[ANTITOXIC] borrar silenciado:', e?.message));
            return true;
        }
        delete chatDb.silenciados[quien];
        saveDB(chat);
    }

    if (!texto || !tieneGrosería(texto, chatDb)) return false;

    try {
        await sock.sendMessage(chat, { delete: rawMsg.key });
    } catch (e: any) {
        console.log('[ANTITOXIC] No pude borrar:', e?.message);
        return false;
    }

    chatDb.advertenciasToxicas = chatDb.advertenciasToxicas || {};
    const total = (chatDb.advertenciasToxicas[quien] || 0) + 1;

    // Tercera advertencia: silencio y el contador se reinicia
    if (total >= MAX_ADVERTENCIAS) {
        delete chatDb.advertenciasToxicas[quien];
        chatDb.silenciados = chatDb.silenciados || {};
        chatDb.silenciados[quien] = Date.now() + MINUTOS_SILENCIO * 60 * 1000;
        saveDB(chat);
        await sock.sendMessage(chat, {
            text: caja('ANTITOXIC', [
                `✧ ${etiqueta(quien)} llegó a ${MAX_ADVERTENCIAS}/${MAX_ADVERTENCIAS} advertencias.`,
                `✦ Silenciado por ${MINUTOS_SILENCIO} minutos.`
            ]),
            mentions: [quien]
        }).catch(() => null);
        return true;
    }

    chatDb.advertenciasToxicas[quien] = total;
    saveDB(chat);
    const restantes = MAX_ADVERTENCIAS - total;
    await sock.sendMessage(chat, {
        text: caja('ADVERTENCIA', [
            `✧ ${etiqueta(quien)} no digas groserías.`,
            `✦ Advertencia » *${total}/${MAX_ADVERTENCIAS}*`,
            `✦ Te quedan ${restantes} ${restantes === 1 ? 'advertencia' : 'advertencias'} antes del silencio.`
        ]),
        mentions: [quien]
    }).catch(() => null);
    return true;
}

export { caja };
