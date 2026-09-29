export default {
    command: ['personalidad', 'personal'],
    description: 'Analiza tu personalidad',
    category: 'tools',
    run: async ({ chat, m, sock, args }) => {
        const target = m.mentionedJid?.[0]? `@${m.mentionedJid[0].split('@')[0]}` : (args.join(' ') || m.pushName);
        const mention = m.mentionedJid?.[0]? [m.mentionedJid[0]] : [];
        const msgId = m?.id || m?.key?.id;

        try {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_thinking', query: target });

            const rand = () => Math.floor(Math.random() * 101);
            const getBar = (percent) => {
                const filled = Math.floor(percent / 10);
                const empty = 10 - filled;
                return '⬢'.repeat(filled) + '⬡'.repeat(empty);
            };

            const stats = {
                'Tóxico': { value: rand(), emoji: '☠️' },
                'Fidelidad': { value: rand(), emoji: '💘' },
                'Lealtad': { value: rand(), emoji: '⚔️' },
                'Amistad': { value: rand(), emoji: '🫂' },
                'Amor': { value: rand(), emoji: '❤️' },
                'Maldad': { value: rand(), emoji: '😈' },
                'Sinceridad': { value: rand(), emoji: '✨' },
            };

            let text = `╭─〔 𖤐 🌸*ANÁLISIS DE PERSONALIDAD*🌸 𖤐 〕─╮\n`;
            text += `│\n`;
            text += `│ 👤 Usuario » ${target}\n`;
            text += `│ 🔮 Escaneando alma...\n`;
            text += `│\n`;
            text += `├─〔 Resultados 〕─\n`;
            text += `│\n`;

            for (const [name, data] of Object.entries(stats)) {
                text += `│ ${data.emoji} *${name}:* ${data.value}%\n`;
                text += `│ ${getBar(data.value)} ${data.value}%\n`;
                text += `│\n`;
            }

            text += `╰────────────────────╯\n`;
            text += `> I am atomic • AKAME BOT🌸`;

            global.broadcast?.('cmd_progress', { id: msgId, step: 'ai_response_ready' });

            const result = await sock.sendMessage(chat, { text, mentions: mention }, { quoted: m });
            global.broadcast?.('cmd_progress', { id: msgId, step: 'completed' });
            return result;

        } catch (e) {
            global.broadcast?.('cmd_progress', { id: msgId, step: 'error', error: e.message });
            return sock.sendMessage(chat, { text: ' ׄ ✿ Error en personalidad.' }, { quoted: m });
        }
    }
}