import axios from 'axios';

export default {
    command: ['pilot'],
    category: 'tools',
    run: async (ctx) => {
        const { sock, msg, chat, args } = ctx;
        if (!args.length) return sock.sendMessage(chat, { text: `Uso: .pilot que es un bot` }, { quoted: msg });

        try {
            const query = args.join(' ');
            const res = await axios.get(`https://api-faa.my.id/faa/webpilot?text=${encodeURIComponent(query)}`, { 
                responseType: 'text',
                timeout: 20000 
            });

            // Arreglo porque la API devuelve "verdadero" en vez de true
            let fixed = res.data.replace(/:\s*verdadero/g, ': true').replace(/:\s*falso/g, ': false');
            const data = JSON.parse(fixed);

            await sock.sendMessage(chat, { text: data.resultado || `❌ Sin respuesta` }, { quoted: msg });

        } catch (e) {
            console.log(e);
            await sock.sendMessage(chat, { text: `❌ Error bro, intenta de nuevo` }, { quoted: msg });
        }
    }
};
