export default {
    command: ['bc', 'broadcast', 'anuncio'],
    description: 'Broadcast a todos los grupos y canal',
    category: 'owner',
    isOwner: true,
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        
        const text = args.join(" ").trim();
        if (!text) return sock.sendMessage(chat, { text: `📢 Uso: .bc Tu mensaje aquí` }, { quoted: msg });

        try {
            await sock.sendMessage(chat, { react: { text: "📢", key: msg.key } });

            const groups = await sock.groupFetchAllParticipating();
            const groupIds = Object.keys(groups);
            const channelId = '120363411107378790@newsletter';
            
            let count = 0;
            const anuncio = `📢 *ANUNCIO OFICIAL AKAME* 📢\n\n${text}`;

            // 1. Enviar a todos los grupos
            for (let id of groupIds) {
                try {
                    await sock.sendMessage(id, { text: anuncio });
                    count++;
                    await new Promise(r => setTimeout(r, 1500));
                } catch {}
            }

            // 2. Enviar al canal
            try {
                await sock.sendMessage(channelId, { text: anuncio });
            } catch (e) {
                console.log('Error canal:', e.message)
            }

            await sock.sendMessage(chat, { text: `✅ Enviado a *${count}* grupos y al canal` }, { quoted: msg });

        } catch (e) {
            console.log(e)
            return sock.sendMessage(chat, { text: `❌ Error` }, { quoted: msg });
        }
    }
};
