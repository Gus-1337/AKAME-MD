import { UserJid } from '#simple';
import config from '#config';

const preguntas = [
  { q: "¿En qué anime sale Gojo?", op: ["Naruto","Jujutsu Kaisen","Bleach","Chainsaw Man"], ans: "B", extra: "Jujutsu Kaisen" },
  { q: "¿Cuál es el sueño de Naruto?", op: ["Ser Hokage","Ser pirata","Ser espadachín","Destruir Konoha"], ans: "A", extra: "Ser Hokage" },
  { q: "¿Qué fruta come Luffy?", op: ["Mera Mera","Gomu Gomu","Yami Yami","Pika Pika"], ans: "B", extra: "Gomu Gomu no Mi" },
  { q: "¿Cómo se llama el titán de Eren?", op: ["Titán de Ataque","Titán Colosal","Titán Acorazado","Titán Bestia"], ans: "A", extra: "Titán de Ataque" },
  { q: "¿Quién es el maestro de Tanjiro?", op: ["Urokodaki","Rengoku","Giyu","Shinobu"], ans: "A", extra: "Sakonji Urokodaki" },
  { q: "¿En qué aldea nace Naruto?", op: ["Konoha","Suna","Kiri","Iwa"], ans: "A", extra: "Konoha" },
  { q: "¿Qué tipo de magia usa Asta?", op: ["Antimagia","Fuego","Viento","Oscuridad"], ans: "A", extra: "Antimagia" },
];

const games = (global as any).triviaAnime || ((global as any).triviaAnime = new Map());
const normalize = (x: string) => String(x).split('@')[0].split(':').pop()?.replace(/[^\d]/g, '') || '';
const coinName = (config as any)?.coin || '¥enes';

async function getUser(db: any, chat: string, sock: any, sender: string) {
  if (!db.chats) db.chats = {};
  if (!db.chats[chat]) db.chats[chat] = {};
  if (!db.chats[chat].users) db.chats[chat].users = {};
  if (!db.chats[chat].triviaStats) db.chats[chat].triviaStats = {};

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
  if (!db.chats[chat].triviaStats[foundKey]) db.chats[chat].triviaStats[foundKey] = { wins: 0, streak: 0 };

  return { realJid, foundKey, user, stats: db.chats[chat].triviaStats[foundKey], allStats: db.chats[chat].triviaStats };
}

export default {
  command: ['trivia','triviatop','triviarank','ans'],
  description: 'Trivia anime pro max',
  category: 'economy',
  group: true,

  before: async ({ m, chat, sock, text, sender }: any) => {
    const game = games.get(chat);
    if (!game) return false;
    let raw = (text || m.text || m.body || '').trim().toUpperCase().split(/[\s\n]+/)[0];
    if (!['A','B','C','D'].includes(raw)) return false;

    const db = (global as any).db?.data;
    const { realJid, foundKey, user, stats } = await getUser(db, chat, sock, sender || m.sender);

    if (raw === game.ans) {
      clearTimeout(game.timeout);
      games.delete(chat);
      const bonus = stats.streak >= 2? 200 : 0;
      const premio = 500 + bonus;
      user.coins = (user.coins || 0) + premio;
      stats.wins += 1;
      stats.streak += 1;

      return sock.sendMessage(chat, {
        text: `✿ *》》TRIVIA GANADA《《* ✿\n\n⛀ Ganador » @${foundKey.split('@')[0]}\n⛀ Respuesta » *${game.ans}: ${game.extra}*\n⚿ Premio » *${premio} ${coinName}* ${bonus?`(+${bonus} por racha x${stats.streak}🔥)` : ''}\n⛀ Racha » *${stats.streak}* seguidas\n⛀ Victorias » *${stats.wins}*\n\n>.triviatop para ver el top`,
        mentions: [foundKey]
      }, { quoted: m });
    } else {
      stats.streak = 0;
      return sock.sendMessage(chat, { text: `「 ꕤ 」 @${foundKey.split('@')[0]} Fallaste! No era ${raw} ❌\n> Racha reiniciada`, mentions: [foundKey] }, { quoted: m });
    }
  },

  run: async ({ chat, m, sock, args, sender, command }: any) => {
    const db = (global as any).db?.data;

    if (['triviatop','triviarank'].includes(command)) {
      const chatDb = db?.chats?.[chat];
      if (!chatDb?.triviaStats) return m.reply("「 ꕤ 」 Nadie ha jugado trivia aún");
      const sorted = Object.entries(chatDb.triviaStats).sort((a: any,b: any) => b[1].wins - a[1].wins).slice(0,10);
      let txt = `✿ *》》TOP TRIVIA ANIME《《* ✿\n\n`;
      for (let i=0;i<sorted.length;i++) {
        const [jid, s]: any = sorted[i];
        txt += `${i+1}. @${jid.split('@')[0]} » ${s.wins} wins 🔥 racha ${s.streak}\n`;
      }
      return sock.sendMessage(chat, { text: txt, mentions: sorted.map((x: any)=>x[0]) }, { quoted: m });
    }

    const existing = games.get(chat);
    if (args[0] && ['A','B','C','D'].includes(args[0].toUpperCase())) {
      // si usa.ans B o.trivia B
      if (!existing) return m.reply("「 ꕤ 」 No hay trivia activa. Usa *.trivia*");
      let raw = args[0].toUpperCase();
      const { realJid, foundKey, user, stats } = await getUser(db, chat, sock, sender);
      if (raw === existing.ans) {
        clearTimeout(existing.timeout);
        games.delete(chat);
        const bonus = stats.streak >= 2? 200 : 0;
        user.coins += 500 + bonus;
        stats.wins++; stats.streak++;
        return sock.sendMessage(chat, { text: `✿ GANASTE @${foundKey.split('@')[0]} +${500+bonus} ${coinName} 🔥`, mentions: [foundKey] }, { quoted: m });
      } else {
        stats.streak = 0;
        return m.reply(`Fallaste, no era ${raw}`);
      }
    }

    if (existing) return m.reply("「 ꕤ 」 Ya hay trivia activa! Responde *A B C D*");

    const data = preguntas[Math.floor(Math.random() * preguntas.length)];
    await sock.sendMessage(chat, {
      text: `✿ *》》TRIVIA ANIME PRO《《* ✿\n\n*${data.q}*\n\n⛀ *A.* ${data.op[0]}\n⛀ *B.* ${data.op[1]}\n⛀ *C.* ${data.op[2]}\n⛀ *D.* ${data.op[3]}\n\n> Premio » *500 ${coinName}* + bonus por racha 🔥\n> Responde » *A B C D* (solo la letra)\n> Tiempo » *25s*`
    }, { quoted: m });

    const timeout = setTimeout(async () => {
      if (games.has(chat)) {
        games.delete(chat);
        await sock.sendMessage(chat, { text: `「 ꕤ 」 Nadie respondió! Era *${data.ans}: ${data.extra}*` }, { quoted: m });
      }
    }, 25000);

    games.set(chat, {...data, timeout });
  }
}