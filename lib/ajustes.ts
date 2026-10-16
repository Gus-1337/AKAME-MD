/**
 * Funciones que cada admin puede activar o desactivar en su grupo.
 * Se guardan en `global.db.data.chats[chat]` con la clave `key`.
 */
export interface FuncionGrupo {
    key: 'antidelete' | 'antiver' | 'antibot' | 'economia' | 'gacha';
    nombre: string;
    descripcion: string;
    porDefecto: boolean;
    alias: string[];
}

export const FUNCIONES_GRUPO: FuncionGrupo[] = [
    {
        key: 'antidelete',
        nombre: 'AntiDelete',
        descripcion: 'Reenvía los mensajes que eliminan en el grupo',
        porDefecto: false,
        alias: ['antieliminar']
    },
    {
        key: 'antiver',
        nombre: 'AntiVer',
        descripcion: 'Reenvía fotos, videos y audios de "ver una vez"',
        porDefecto: false,
        alias: ['antiviewonce']
    },
    {
        key: 'antibot',
        nombre: 'AntiBot',
        descripcion: 'Detecta y elimina bots intrusos',
        porDefecto: false,
        alias: []
    },
    {
        key: 'economia',
        nombre: 'Economía',
        descripcion: 'Comandos de economía (trabajar, pescar, cazar, cofre…)',
        porDefecto: true,
        alias: ['economy']
    },
    {
        key: 'gacha',
        nombre: 'Gacha',
        descripcion: 'Waifus, Pokémon y RPG',
        porDefecto: true,
        alias: ['rpg']
    }
];

/** Devuelve si la función está activa en el chat (usa el valor por defecto si nunca se tocó). */
export const estaActiva = (chatDb: any, key: FuncionGrupo['key']): boolean => {
    const f = FUNCIONES_GRUPO.find((x) => x.key === key);
    const v = chatDb?.[key];
    if (typeof v === 'boolean') return v;
    return f ? f.porDefecto : false;
};

const ON = ['on', '1', 'enable', 'activar', 'encender'];
const OFF = ['off', '0', 'disable', 'desactivar', 'apagar'];

/** Crea el comando on/off de una función (ej. `.antidelete on`). */
export const crearToggle = (f: FuncionGrupo) => ({
    command: [f.key, ...f.alias],
    description: `Activa o desactiva ${f.nombre} en el grupo`,
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: f.key === 'antibot' || f.key === 'antidelete' || f.key === 'antiver',

    run: async ({ chat, m, args, sock, usedPrefix }: any) => {
        const { saveDB } = await import('./database.ts');
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });
        if (!global.db?.data?.chats) global.db.data.chats = {};
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {};
        const chatDb = global.db.data.chats[chat];
        const p = usedPrefix || '.';
        const input = String(args?.[0] || '').toLowerCase();

        if (!input) {
            const estado = estaActiva(chatDb, f.key) ? '✓ Activado' : '✘ Desactivado';
            return reply(
                `✦ *${f.nombre.toUpperCase()}*\n\n` +
                `✧ ${f.descripcion}\n\n` +
                `✐ Activar » *${p}${f.key} on*\n` +
                `✐ Desactivar » *${p}${f.key} off*\n\n` +
                `✦ Estado: *${estado}*`
            );
        }
        if (ON.includes(input)) {
            chatDb[f.key] = true;
            saveDB(chat);
            return reply(`✓ *${f.nombre}* activado en este grupo.`);
        }
        if (OFF.includes(input)) {
            chatDb[f.key] = false;
            saveDB(chat);
            return reply(`✘ *${f.nombre}* desactivado en este grupo.`);
        }
        return reply(`✿ Usa *${p}${f.key} on* o *${p}${f.key} off*`);
    }
});

/** Funciones que ya existían como comandos propios; el panel sólo lee su estado. */
const EXISTENTES: { nombre: string; cmd: string; activa: (db: any) => boolean }[] = [
    { nombre: 'NSFW', cmd: 'nsfw', activa: (db) => !!db.nsfw },
    { nombre: 'AntiLink', cmd: 'antilink', activa: (db) => !!db.antilinks },
    { nombre: 'AntiToxic', cmd: 'antitoxic', activa: (db) => !!db.antitoxic },
    { nombre: 'AntiSpam', cmd: 'antispam', activa: (db) => !!db.antiSpam },
    { nombre: 'Bienvenida', cmd: 'welcome', activa: (db) => !!db.welcome },
    { nombre: 'Despedida', cmd: 'bye', activa: (db) => !!db.bye },
];

/** Panel con el estado de todas las funciones del grupo. */
export const panelAjustes = {
    command: ['ajustes', 'funciones', 'estadogrupo', 'gp'],
    description: 'Muestra qué funciones del grupo están activas',
    category: 'admin',
    group: true,
    admin: true,

    run: async ({ chat, m, sock, usedPrefix }: any) => {
        const chatDb = global.db?.data?.chats?.[chat] || {};
        const p = usedPrefix || '.';
        const linea = (nombre: string, on: boolean) => `✐ ${nombre} › ${on ? '✓ Activado' : '✘ Desactivado'}`;
        const nuevas = FUNCIONES_GRUPO.map((f) => linea(f.nombre, estaActiva(chatDb, f.key)));
        const viejas = EXISTENTES.map((f) => linea(f.nombre, f.activa(chatDb)));
        const texto =
            `✦ *AJUSTES DEL GRUPO* ✦\n\n` +
            [...nuevas, ...viejas].join('\n') +
            `\n\n✧ Cambiar: *${p}antidelete on/off*, *${p}antiver on/off*, *${p}antibot on/off*, *${p}economia on/off*, *${p}gacha on/off*, *${p}nsfw on/off*, *${p}antilink on/off*, *${p}antitoxic on/off*, *${p}antispam*, *${p}welcome on/off*, *${p}bye on/off*`;
        return sock.sendMessage(chat, { text: texto }, { quoted: m });
    }
};
