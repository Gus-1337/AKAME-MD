import axios from 'axios';

export default {
    command: ['poema'],
    category: 'fun',
    description: 'Envía un poema aleatorio',
    run: async (ctx) => {
        const { sock, msg, chat } = ctx;
        try {
            const { data } = await axios.get('https://api-faa.my.id/faa/pantun', { timeout: 10000 });
            await sock.sendMessage(chat, { text: data.pantun }, { quoted: msg });
        } catch (e) {
            await sock.sendMessage(chat, { text: `❌ Error` }, { quoted: msg });
        }
    }
};
