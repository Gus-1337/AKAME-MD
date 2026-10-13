import { UserJid } from '#simple';
import { activeEffectsLine, coinMultiplier, effectiveCooldown, softenPenalty } from '#shop';
import config from '#config';
import { saveDB } from '#db';
const normalizeNumber = (x) => { let c = String(x).split('@')[0].split(':').pop() || ''; return c.replace(/[^\d]/g, ''); };
export default {
    command: ['fish', 'pescar'],
    description: 'Pesca y gana',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, sender }) => {
        const realSender = await UserJid(sock, chat, sender);
        const chatUsers = global.db.data.chats[chat].users;
        let user = chatUsers[realSender]; if (!user) user = chatUsers[realSender] = { coins: 0, bank: 0, inventory: {} };
        const COOLDOWN = effectiveCooldown(user, 2 * 60 * 1000);
        if (user.lastFish && Date.now() - user.lastFish < COOLDOWN) return sock.sendMessage(chat, { text: `「✿」 Espera ${Math.ceil((COOLDOWN - (Date.now()-user.lastFish))/1000)}s` }, { quoted: m });
        const peces = [{name:'Sardina 🐟',coins:200},{name:'Tiburón 🦈',coins:1500},{name:'Pulpo 🐙',coins:800},{name:'Ballena 🐳',coins:3000}];
        let p = peces[Math.floor(Math.random()*peces.length)];
        const ganancia = p.coins * coinMultiplier(user);
        user.coins = (user.coins||0)+ganancia; user.lastFish = Date.now();
        if (!user.inventory) user.inventory = {}; user.inventory[p.name] = (user.inventory[p.name]||0)+1;
        saveDB(chat, realSender);
        await sock.sendMessage(chat, { text: `「🎣」 Pescaste un *${p.name}* y ganaste *${ganancia.toLocaleString()} ${config?.coin||'¥enes'}*${activeEffectsLine(user)}` }, { quoted: m });
    }
};
