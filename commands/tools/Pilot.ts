import axios from 'axios';

export default {
    command: ['pilot'],
    category: 'tools',
    description: 'IA WebPilot',
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        if (!args.length) {
            return sock.sendMessage(chat, { text: `❌ Uso: .pilot Que es un bot` }, { quoted: msg });
        }
        try {
            const query = args.join(' ');
            const { data } = await axios.get(`https://api-faa.my.id/faa/webpilot?text=${encodeURIComponent(query)}`, { timeout: 20000 });
            await sock.sendMessage(chat, { text: data.resultado }, { quoted: msg });
        } catch {
            await sock.sendMessage(chat, { text: `❌ Error` }, { quoted: msg });
        }
    }
};
