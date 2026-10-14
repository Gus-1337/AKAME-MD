import { titulo } from '#shop';
import { UserJid } from '#simple';
import config from '#config';

const preguntas = [
  { q: "¿En qué anime sale Gojo?", op: ["Naruto","Jujutsu Kaisen","Bleach","Chainsaw Man"], ans: "B", extra: "Jujutsu Kaisen" },
  { q: "¿Cuál es el sueño de Naruto?", op: ["Ser Hokage","Ser pirata","Ser espadachín","Destruir Konoha"], ans: "A", extra: "Ser Hokage" },
  { q: "¿Qué fruta come Luffy?", op: ["Mera Mera","Gomu Gomu","Yami Yami","Pika Pika"], ans: "B", extra: "Gomu Gomu" },
  { q: "¿Cómo se llama el titán de Eren?", op: ["Titán de Ataque","Titán Colosal","Titán Acorazado","Titán Bestia"], ans: "A", extra: "Titán de Ataque" },
  { q: "¿Quién es el maestro de Tanjiro?", op: ["Urokodaki","Rengoku","Giyu","Shinobu"], ans: "A", extra: "Urokodaki" },
  { q: "¿En qué aldea nace Naruto?", op: ["Konoha","Suna","Kiri","Iwa"], ans: "A", extra: "Konoha" },
  { q: "¿Qué tipo de magia usa Asta?", op: ["Antimagia","Fuego","Viento","Oscuridad"], ans: "A", extra: "Antimagia" },
  { q: "¿Cómo se llama el protagonista de Death Note?", op: ["Light Yagami","L Lawliet","Ryuk","Misa Amane"], ans: "A", extra: "Light Yagami" },
  { q: "¿Quién es el capitán de los Sombrero de Paja?", op: ["Zoro","Luffy","Sanji","Usopp"], ans: "B", extra: "Luffy" },
  { q: "¿Qué raza es Goku?", op: ["Saiyajin","Namekiano","Humano","Androide"], ans: "A", extra: "Saiyajin" },
  { q: "¿Cuántas esferas del dragón hay?", op: ["5","6","7","8"], ans: "C", extra: "7" },
  { q: "¿Quién es el príncipe Saiyajin rival de Goku?", op: ["Vegeta","Freezer","Piccolo","Gohan"], ans: "A", extra: "Vegeta" },
  { q: "¿Quién entrenó a Goku de niño?", op: ["Maestro Roshi","Piccolo","Kami","Bulma"], ans: "A", extra: "Maestro Roshi" },
  { q: "¿Cómo se llama el hijo mayor de Goku?", op: ["Goten","Gohan","Trunks","Pan"], ans: "B", extra: "Gohan" },
  { q: "¿Cómo se llaman los hermanos protagonistas de Fullmetal Alchemist?", op: ["Edward y Alphonse Elric","Roy y Riza","Ling y Lan Fan","Scar y Winry"], ans: "A", extra: "Edward y Alphonse Elric" },
  { q: "¿Cómo se llama el padre de Gon?", op: ["Ging","Kite","Hisoka","Netero"], ans: "A", extra: "Ging" },
  { q: "¿Cómo se llama la hermana de Tanjiro?", op: ["Nezuko","Shinobu","Mitsuri","Kanao"], ans: "A", extra: "Nezuko" },
  { q: "¿Qué respiración usa Tanjiro?", op: ["Fuego","Agua","Trueno","Viento"], ans: "B", extra: "Agua" },
  { q: "¿Qué respiración usa Zenitsu?", op: ["Agua","Trueno","Roca","Llama"], ans: "B", extra: "Trueno" },
  { q: "¿Quién es la Hashira del amor?", op: ["Mitsuri Kanroji","Shinobu Kocho","Kanae Kocho","Tamayo"], ans: "A", extra: "Mitsuri Kanroji" },
  { q: "¿Qué compañero de Yuji usa las sombras?", op: ["Megumi","Nobara","Maki","Panda"], ans: "A", extra: "Megumi" },
  { q: "¿Qué técnica usa Gojo?", op: ["Shikigami","Infinito","Sangre","Ilusión"], ans: "B", extra: "Infinito" },
  { q: "¿Quién es el rey de las maldiciones?", op: ["Ryomen Sukuna","Mahito","Kenjaku","Toji"], ans: "A", extra: "Ryomen Sukuna" },
  { q: "¿Quién es el Titán Acorazado?", op: ["Reiner","Bertholdt","Annie","Zeke"], ans: "A", extra: "Reiner" },
  { q: "¿A qué cuerpo pertenece Levi?", op: ["Policía Militar","Legión de Reconocimiento","Guarnición","Gendarmería"], ans: "B", extra: "Legión de Reconocimiento" },
  { q: "¿Cómo se llama el zorro de nueve colas?", op: ["Shukaku","Kurama","Matatabi","Gyuki"], ans: "B", extra: "Kurama" },
  { q: "¿Quién es el maestro de Naruto?", op: ["Kakashi","Jiraiya","Orochimaru","Tsunade"], ans: "B", extra: "Jiraiya" },
  { q: "¿Qué jutsu de rayo usa Sasuke?", op: ["Chidori","Rasengan","Katon","Doton"], ans: "A", extra: "Chidori" },
  { q: "¿Quién es el Kazekage de Suna?", op: ["Gaara","Temari","Kankuro","Baki"], ans: "A", extra: "Gaara" },
  { q: "¿Cómo se llama la espada de Ichigo?", op: ["Zangetsu","Tensa","Kubikiri","Shinsō"], ans: "A", extra: "Zangetsu" },
  { q: "¿Quién es el protagonista de Bleach?", op: ["Ichigo Kurosaki","Renji","Rukia","Byakuya"], ans: "A", extra: "Ichigo Kurosaki" },
  { q: "¿Quién le da poderes de shinigami a Ichigo?", op: ["Rukia Kuchiki","Orihime","Chad","Uryu"], ans: "A", extra: "Rukia Kuchiki" },
  { q: "¿Cómo se llama el barco de los Sombrero de Paja?", op: ["Going Merry","Thousand Sunny","Moby Dick","Oro Jackson"], ans: "B", extra: "Thousand Sunny" },
  { q: "¿Quién es el espadachín del grupo de Luffy?", op: ["Zoro","Sanji","Franky","Brook"], ans: "A", extra: "Zoro" },
  { q: "¿Quién es el cocinero del grupo de Luffy?", op: ["Sanji","Usopp","Chopper","Robin"], ans: "A", extra: "Sanji" },
  { q: "¿Quién es el médico de los Sombrero de Paja?", op: ["Robin","Chopper","Brook","Jinbe"], ans: "B", extra: "Chopper" },
  { q: "¿Qué fruta del diablo comió Nico Robin?", op: ["Hana Hana","Ope Ope","Mera Mera","Yami Yami"], ans: "A", extra: "Hana Hana" },
  { q: "¿Quién es el Rey de los Piratas?", op: ["Gol D. Roger","Whitebeard","Shanks","Kaido"], ans: "A", extra: "Gol D. Roger" },
  { q: "¿Cómo se llama la protagonista de Sailor Moon?", op: ["Ami Mizuno","Usagi Tsukino","Rei Hino","Makoto Kino"], ans: "B", extra: "Usagi Tsukino" },
  { q: "¿Quién es Sailor Mercury?", op: ["Ami Mizuno","Rei Hino","Makoto Kino","Minako Aino"], ans: "A", extra: "Ami Mizuno" },
  { q: "¿Qué shinigami deja caer el cuaderno en Death Note?", op: ["Rem","Ryuk","Gelus","Sidoh"], ans: "B", extra: "Ryuk" },
  { q: "¿Cómo se llama el detective rival de Light?", op: ["Mello","Near","L","Matsuda"], ans: "C", extra: "L" },
  { q: "¿Quién es el protagonista de Chainsaw Man?", op: ["Aki","Denji","Power","Makima"], ans: "B", extra: "Denji" },
  { q: "¿Cómo se llama el demonio de la motosierra?", op: ["Pochita","Kobeni","Quanxi","Beam"], ans: "A", extra: "Pochita" },
  { q: "¿Cómo se llama el padre de la familia Forger?", op: ["Loid Forger","Yor Forger","Anya Forger","Franky Franklin"], ans: "A", extra: "Loid Forger" },
  { q: "¿Cómo se llama el perro de la familia Forger?", op: ["Bond","Pochita","Chico","Bob"], ans: "A", extra: "Bond" },
  { q: "¿Quién es la protagonista de Frieren?", op: ["Frieren","Fern","Stark","Himmel"], ans: "A", extra: "Frieren" },
  { q: "¿Quién es la aprendiz de Frieren?", op: ["Fern","Stark","Eisen","Ubel"], ans: "A", extra: "Fern" },
  { q: "¿Cómo se llama el héroe que viajó con Frieren?", op: ["Himmel","Heiter","Eisen","Stark"], ans: "A", extra: "Himmel" },
  { q: "¿Cuál es el quirk de Izuku Midoriya?", op: ["Todo Poder","One For All","Explosión","Hielo"], ans: "B", extra: "One For All" },
  { q: "¿Cuál es el quirk de Katsuki Bakugo?", op: ["Explosión","Hielo","Fuego","Rayo"], ans: "A", extra: "Explosión" },
  { q: "¿Cómo se llama la película de Ghibli sobre una niña en un mundo de espíritus?", op: ["El viaje de Chihiro","Mi vecino Totoro","Ponyo","Nausicaä"], ans: "A", extra: "El viaje de Chihiro" },
  { q: "¿Qué Pokémon es el compañero de Ash?", op: ["Pikachu","Charmander","Bulbasaur","Squirtle"], ans: "A", extra: "Pikachu" },
  { q: "¿Cómo se llama el pueblo natal de Ash?", op: ["Ciudad Verde","Pueblo Paleta","Ciudad Plateada","Ciudad Celeste"], ans: "B", extra: "Pueblo Paleta" },
  { q: "¿Quién pilotea el EVA-01?", op: ["Asuka","Rei","Shinji","Kaworu"], ans: "C", extra: "Shinji" },
  { q: "¿Cómo se llama el héroe calvo de One Punch Man?", op: ["Genos","Saitama","Garou","Metal Knight"], ans: "B", extra: "Saitama" },
  { q: "¿Cómo se llama el protagonista de Tokyo Ghoul?", op: ["Touka","Ken Kaneki","Hide","Arima"], ans: "B", extra: "Ken Kaneki" },
  { q: "¿Cuál es el nombre real de Mob en Mob Psycho 100?", op: ["Ritsu","Shigeo Kageyama","Arataka Reigen","Teru"], ans: "B", extra: "Shigeo Kageyama" },
  { q: "¿Cómo se llama el protagonista de Sword Art Online?", op: ["Asuna","Kirito","Klein","Agil"], ans: "B", extra: "Kirito" },
  { q: "¿Quién es el protagonista de Hunter x Hunter?", op: ["Killua","Gon Freecss","Kurapika","Leorio"], ans: "B", extra: "Gon Freecss" },
  { q: "¿Cómo se llama el cyborg de One Punch Man?", op: ["Genos","Metal Bat","Tatsumaki","Bang"], ans: "A", extra: "Genos" },
  { q: "¿Cuál es el planeta natal de los Saiyajin?", op: ["Vegeta","Namek","Tierra","Marte"], ans: "A", extra: "Vegeta" },
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
        text: `${titulo('TRIVIA GANADA')}\n\n✩ Ganador » @${foundKey.split('@')[0]}\n✩ Respuesta » *${game.ans}: ${game.extra}*\n⚿ Premio » *${premio} ${coinName}* ${bonus?`(+${bonus} por racha x${stats.streak}🔥)` : ''}\n✩ Racha » *${stats.streak}* seguidas\n✩ Victorias » *${stats.wins}*\n\n>.triviatop para ver el top`,
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
        return sock.sendMessage(chat, { text: `✩ GANASTE @${foundKey.split('@')[0]} +${500+bonus} ${coinName} 🔥`, mentions: [foundKey] }, { quoted: m });
      } else {
        stats.streak = 0;
        return m.reply(`Fallaste, no era ${raw}`);
      }
    }

    if (existing) return m.reply("「 ꕤ 」 Ya hay trivia activa! Responde *A B C D*");

    // Evita repetir las últimas preguntas del bot (guarda las 20 más recientes)
    const recientes: number[] = (global as any).triviaRecientes || ((global as any).triviaRecientes = []);
    const disponibles = preguntas.map((_, i) => i).filter((i) => !recientes.includes(i));
    const pool = disponibles.length ? disponibles : preguntas.map((_, i) => i);
    const elegida = pool[Math.floor(Math.random() * pool.length)];
    recientes.push(elegida);
    if (recientes.length > 20) recientes.shift();
    const data = preguntas[elegida];
    await sock.sendMessage(chat, {
      text: `${titulo('TRIVIA ANIME')}\n\n*${data.q}*\n\n✩ *A.* ${data.op[0]}\n✩ *B.* ${data.op[1]}\n✩ *C.* ${data.op[2]}\n✩ *D.* ${data.op[3]}\n\n> Premio » *500 ${coinName}* + bonus por racha 🔥\n> Responde » *A B C D* (solo la letra)\n> Tiempo » *25s*`
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