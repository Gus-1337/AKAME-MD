export default {
    command: ['parejas', 'pareja'],
    category: 'tools',
    run: async (ctx) => {
        const { sock, msg, chat, isGroup } = ctx;
        if (!isGroup) return sock.sendMessage(chat, { text: "❌ Solo en grupos" }, { quoted: msg });

        const metadata = await sock.groupMetadata(chat);
        let users = metadata.participants.map(p => p.id).filter(id => id !== sock.user.id);
        if (users.length < 2) return sock.sendMessage(chat, { text: "❌ Mínimo 2 personas" }, { quoted: msg });

        users = users.sort(() => Math.random() - 0.5);

        const getFrase = (por) => {
            let lista = [];
            if (por > 85) lista = ["🔥 se comen en una", "💘 puro fuego", "🥵 ya están en cama", "💋 se dan duro", "🔥 tóxicos pero se aman"];
            else if (por > 65) lista = ["💞 buen match", "✨ combinan bien", "💘 hay química", "😏 se gustan", "👀 se miran rico"];
            else if (por > 40) lista = ["🤔 con esfuerzo sale", "😅 si se esfuerzan", "🫣 puede funcionar", "💬 hablen más", "🤷 intenta nomás"];
            else lista = ["💔 ni con brujería", "😂 mejor amigos", "💀 cero química", "🤣 se odian", "🙄 ni a balas", "😒 mejor solos"];

            return lista[Math.floor(Math.random() * lista.length)];
        };

        let txt = `💘 *PAREJAS AKAME* 💘\n\n`;
        
        for (let i = 0; i < users.length - 1; i += 2) {
            let por = Math.floor(Math.random() * 100) + 1;
            txt += `💞 @${users[i].split('@')[0]} + @${users[i+1].split('@')[0]} → ${por}% ${getFrase(por)}\n`;
        }

        if (users.length % 2 !== 0) {
            txt += `\n😢 @${users[users.length - 1].split('@')[0]} sin pareja`;
        }

        await sock.sendMessage(chat, { text: txt, mentions: users }, { quoted: msg });
    }
};