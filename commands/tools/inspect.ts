export default {
    command: ['inspect', 'id', 'getid'],
    description: 'Inspector de IDs - canales, grupos y numeros',
    category: 'tools',
    run: async ({ chat, m, sock, args }) => {
        const msgId = m?.id || m?.key?.id;
        try {
            const contextInfo = m?.message?.extendedTextMessage?.contextInfo || {};
            const input = args[0] || "";
            const currentChatId = chat;

            // --- SI NO PONE NADA, MENU BONITO ---
            if (!input &&!contextInfo?.forwardedNewsletterMessageInfo &&!m?.quoted) {
                let tipo = "Privado";
                if (currentChatId.endsWith('@g.us')) tipo = "Grupo";
                if (currentChatId.endsWith('@newsletter')) tipo = "Canal";

                let help = `*🔎 INSPECTOR AKAME*\n\n`;
                help += `*📍 CHAT ACTUAL*\n`;
                help += `> 🆔 ID: ${currentChatId}\n`;
                help += `> 📂 Tipo: ${tipo}\n\n`;
                help += `*✨ COMO USARLO:*\n\n`;
                help += `*1. Para Canal:*\n`;
                help += `> \`.inspect https://whatsapp.com/channel/xxxxx\`\n\n`;
                help += `*2. Para Grupo:*\n`;
                help += `> \`.inspect https://chat.whatsapp.com/xxxxx\`\n\n`;
                help += `*3. Para Numero:*\n`;
                help += `> \`.inspect 51926519334\`\n`;
                help += `> \`.inspect +51 926 519 334\`\n\n`;
                help += `*4. Truco rápido:*\n`;
                help += `> Responde a un mensaje reenviado de un canal y escribe \`.inspect\`\n\n`;
                help += `_AKAME BOT 👹_`;

                return await sock.sendMessage(chat, { text: help }, { quoted: m });
            }

            // --- 1. DETECTA CANAL ---
            if (input.includes('whatsapp.com/channel/')) {
                const code = input.split('channel/')[1].split('/')[0].split('?')[0];
                try {
                    const meta = await sock.newsletterMetadata("invite", code);
                    let text = `*🔎 Información del Canal*\n\n`;
                    text += `🆔 *ID:* ${meta.id}\n`;
                    text += `📛 *Nombre:* ${meta.name || 'No disponible'}\n`;
                    text += `👥 *Suscriptores:* ${meta.subscribers || 'No disponible'}\n`;
                    text += `📶 *Estado:* ${meta.state || 'ACTIVE'}\n`;
                    text += `✅ *Verificado:* ${meta.verification === 'VERIFIED'? 'Si' : 'No'}\n\n`;
                    text += `> \`${meta.id}\``;
                    return await sock.sendMessage(chat, { text }, { quoted: m });
                } catch (e) {
                    return await sock.sendMessage(chat, { text: `❌ No pude sacar info del canal\nCode: ${code}\nError: ${e.message}` }, { quoted: m });
                }
            }

            // --- 2. DETECTA GRUPO ---
            if (input.includes('chat.whatsapp.com/')) {
                const code = input.split('chat.whatsapp.com/')[1].split('/')[0].split('?')[0];
                try {
                    const meta = await sock.groupGetInviteInfo(code);
                    let text = `*🔎 Información del Grupo*\n\n`;
                    text += `🆔 *ID:* ${meta.id}\n`;
                    text += `📛 *Nombre:* ${meta.subject || 'No disponible'}\n`;
                    text += `👑 *Creador:* ${meta.owner? '@' + meta.owner.split('@')[0] : 'No disponible'}\n`;
                    text += `👥 *Miembros:* ${meta.size || meta.participants?.length || 'No disponible'}\n`;
                    text += `📅 *Creado:* ${meta.creation? new Date(meta.creation * 1000).toLocaleDateString() : 'No disponible'}\n\n`;
                    text += `> \`${meta.id}\``;
                    return await sock.sendMessage(chat, { text }, { quoted: m, mentions: meta.owner? [meta.owner] : [] });
                } catch (e) {
                    return await sock.sendMessage(chat, { text: `❌ No pude sacar info del grupo\nCode: ${code}\nError: ${e.message}` }, { quoted: m });
                }
            }

            // --- 3. DETECTA NUMERO ---
            if (/^\+?[\d\s\-()]+$/.test(input) && input.replace(/\D/g, '').length >= 8) {
                const num = input.replace(/\D/g, '');
                const jid = num + '@s.whatsapp.net';
                const exists = await sock.onWhatsApp(jid);
                let text = `*🔎 Información del Número*\n\n`;
                text += `📱 *Número:* +${num}\n`;
                text += `🆔 *JID:* ${jid}\n`;
                text += `📶 *En WhatsApp:* ${exists && exists[0]?.exists? 'Si ✅' : 'No ❌'}\n\n`;
                text += `> \`${jid}\``;
                return await sock.sendMessage(chat, { text }, { quoted: m });
            }

            // --- 4. RESPONDIENDO A MENSAJE REENVIADO DE CANAL ---
            if (contextInfo?.forwardedNewsletterMessageInfo) {
                const info = contextInfo.forwardedNewsletterMessageInfo;
                let text = `*🔎 Información del Canal*\n\n`;
                text += `🆔 *ID:* ${info.newsletterJid}\n`;
                text += `📛 *Nombre:* ${info.newsletterName || 'No disponible'}\n`;
                text += `👥 *Suscriptores:* No disponible\n`;
                text += `📶 *Estado:* ACTIVE\n`;
                text += `✅ *Verificado:* No\n\n`;
                text += `> \`${info.newsletterJid}\``;
                return await sock.sendMessage(chat, { text }, { quoted: m });
            }

            // --- 5. ESTA EN UN GRUPO ---
            if (currentChatId.endsWith('@g.us')) {
                const meta = await sock.groupMetadata(currentChatId);
                let text = `*🔎 Información del Grupo*\n\n`;
                text += `🆔 *ID:* ${currentChatId}\n`;
                text += `📛 *Nombre:* ${meta.subject}\n`;
                text += `👥 *Miembros:* ${meta.participants.length}\n`;
                text += `📅 *Creado por:* @${meta.owner?.split('@')[0] || 'N/A'}\n\n`;
                text += `> \`${currentChatId}\``;
                return await sock.sendMessage(chat, { text, mentions: meta.owner? [meta.owner] : [] }, { quoted: m });
            }

            return await sock.sendMessage(chat, { text: `❌ No entendí que quieres inspeccionar.\nEscribe solo \`.inspect\` para ver el menú.` }, { quoted: m });

        } catch (e) {
            return sock.sendMessage(chat, { text: ` ✿ Error: ${e.message}` }, { quoted: m });
        }
    }
}