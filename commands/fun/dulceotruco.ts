import { UserJid } from '#simple';
import config from '#config';

// ===== EVENTO TEMPORAL DE HALLOWEEN =====
// El juego solo funciona entre estas fechas (hora de Lima).
// Cuando termine el evento, el comando avisa que ya no está disponible.
// Para quitarlo del todo, borra este archivo.
const EVENTO_INICIO = new Date('2026-10-13T00:00:00-05:00');
const EVENTO_FIN = new Date('2026-11-02T00:00:00-05:00');
// ========================================

const TIEMPO_RONDA = 30000;
const PREMIO_DULCE = 300;
const PENALIDAD_TRUCO = 50;

const TRUCOS = [
    '🕷️ ¡Una araña de goma te cayó en la mano!',
    '👻 Un fantasma te susurró al oído... ¡buuu!',
    '🦇 ¡Un murciélago salió volando de la calabaza!',
    '🐈‍⬛ Un gato negro te bufó y se fue corriendo',
    '💀 Un esqueleto te asustó con un chillido',
    '🎃 ¡La calabaza estaba podrida! Qué asco',
    '🕸️ Te enredaste en una telaraña gigante'
];

const EMOJI_NUM = ['1️⃣', '2️⃣', '3️⃣'];

const partidas: Map<string, any> = (global as any).dulceoTruco || ((global as any).dulceoTruco = new Map());
const normalize = (x: string) => String(x).split('@')[0].split(':').pop()?.replace(/[^\d]/g, '') || '';
const coinName = (config as any)?.coin || '¥enes';

const eventoActivo = () => {
    const ahora = Date.now();
    return ahora >= EVENTO_INICIO.getTime() && ahora < EVENTO_FIN.getTime();
};

const avisoFin = (sock: any, chat: string, m: any) =>
    sock.sendMessage(chat, {
        text: '🎃 *El evento de Halloween terminó* 🎃\n> El juego *Dulce o Truco* ya no está disponible. ¡Nos vemos el próximo año! 🦇'
    }, { quoted: m });

async function getUser(db: any, chat: string, sock: any, sender: string) {
    if (!db.chats) db.chats = {};
    if (!db.chats[chat]) db.chats[chat] = {};
    if (!db.chats[chat].users) db.chats[chat].users = {};

    const realJid = await UserJid(sock, chat, sender);
    let foundKey = realJid;
    let user = db.chats[chat].users[realJid];
    if (!user) {
        const target = normalize(realJid);
        for (const [k, v] of Object.entries(db.chats[chat].users)) {
            if (normalize(k) === target) { user = v as any; foundKey = k; break; }
        }
    }
    if (!user) {
        db.chats[chat].users[realJid] = { coins: 0, bank: 0 };
        user = db.chats[chat].users[realJid];
    }
    return { foundKey, user };
}

const mezclar = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

export default {
    command: ['dulceotruco', 'dulce', 'truco', 'halloween'],
    description: 'Juego de Halloween: elige una calabaza, ¿dulce o truco?',
    category: 'fun',
    group: true,

    before: async ({ m, chat, sock, text, sender }: any) => {
        const partida = partidas.get(chat);
        if (!partida) return false;

        if (!eventoActivo()) {
            clearTimeout(partida.timeout);
            partidas.delete(chat);
            return false;
        }

        const elegida = String(text || m.text || m.body || '').trim();
        if (!/^[123]$/.test(elegida)) return false;

        const jid = sender || m.sender;
        const idx = Number(elegida) - 1;
        const db = (global as any).db?.data;

        if (partida.jugaron.has(normalize(jid))) {
            return sock.sendMessage(chat, {
                text: `👻 @${normalize(jid)} ya abriste una calabaza en esta ronda. ¡Espera a los demás!`,
                mentions: [jid]
            }, { quoted: m });
        }
        if (partida.abiertas.includes(idx)) {
            return m.reply('🎃 Esa calabaza ya fue abierta, elige otra.');
        }

        partida.jugaron.add(normalize(jid));
        partida.abiertas.push(idx);
        const { foundKey, user } = await getUser(db, chat, sock, jid);
        const nombre = `@${foundKey.split('@')[0]}`;

        if (partida.contenido[idx] === 'dulce') {
            clearTimeout(partida.timeout);
            partidas.delete(chat);
            user.coins = (user.coins || 0) + PREMIO_DULCE;
            return sock.sendMessage(chat, {
                text: `🍬 *¡DULCES!* 🍬\n\n${EMOJI_NUM[idx]} Calabaza ganadora de ${nombre}\n\n⛀ Premio » *+${PREMIO_DULCE} ${coinName}*\n> ¡Felicidades, eres el dueño de los dulces! 🎃`,
                mentions: [foundKey]
            }, { quoted: m });
        }

        const perdido = Math.min(PENALIDAD_TRUCO, user.coins || 0);
        user.coins = (user.coins || 0) - perdido;
        const truco = TRUCOS[Math.floor(Math.random() * TRUCOS.length)];
        const quedan = 3 - partida.abiertas.length;
        return sock.sendMessage(chat, {
            text: `🎃 *¡TRUCO!* 🎃\n\n${EMOJI_NUM[idx]} ${nombre} abrió una calabaza...\n${truco}\n\n⛀ Penalidad » *-${perdido} ${coinName}*\n> Quedan ${quedan} calabaza(s) cerradas`,
            mentions: [foundKey]
        }, { quoted: m });
    },

    run: async ({ chat, m, sock }: any) => {
        if (!eventoActivo()) return avisoFin(sock, chat, m);

        if (partidas.has(chat)) {
            return m.reply('🦇 Ya hay una ronda de *Dulce o Truco* en este grupo. ¡Responde *1*, *2* o *3*!');
        }

        // La calabaza con dulces se elige al azar en cada ronda
        const contenido = mezclar(['dulce', 'truco', 'truco']);
        const partida: any = { contenido, abiertas: [], jugaron: new Set<string>(), timeout: null };

        await sock.sendMessage(chat, {
            text:
                `🎃 *》》 DULCE O TRUCO 《《* 🎃\n` +
                `🦇 ─────────────────── 🦇\n\n` +
                `👻 Hay *3 calabazas* en la plaza...\n` +
                `🍬 Una tiene dulces, pero las otras guardan un truco.\n\n` +
                `${EMOJI_NUM[0]} 🎃 Calabaza naranja\n` +
                `${EMOJI_NUM[1]} 🎃 Calabaza verde\n` +
                `${EMOJI_NUM[2]} 🎃 Calabaza negra\n\n` +
                `⛀ Premio » *+${PREMIO_DULCE} ${coinName}*\n` +
                `⛀ Truco » *-${PENALIDAD_TRUCO} ${coinName}*\n` +
                `⛀ Cada jugador abre *una* calabaza\n` +
                `⏳ Tiempo » *30s*\n\n` +
                `> Responde *1*, *2* o *3*`
        }, { quoted: m });

        partida.timeout = setTimeout(async () => {
            if (partidas.get(chat) !== partida) return;
            partidas.delete(chat);
            const pos = contenido.indexOf('dulce') + 1;
            await sock.sendMessage(chat, {
                text: `👻 *Se acabó el tiempo...*\nNadie encontró los dulces 🍬\n> La calabaza con dulces era la *${EMOJI_NUM[pos - 1]}*`
            });
        }, TIEMPO_RONDA);

        partidas.set(chat, partida);
    }
};
