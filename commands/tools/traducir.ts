import { pedirUtil } from '#popcat';

export default {
    command: ['traducir', 'tr'],
    description: 'Traduce un texto. Uso: .traducir en hello world',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        const destino = (args?.[0] || '').toLowerCase();
        const texto = (args || []).slice(1).join(' ').trim();
        if (!destino || !texto) {
            return sock.sendMessage(chat, {
                text: '   ׄ  ✿  Uso: *.traducir <idioma> <texto>*\n> Ej: *.traducir en hola a todos*'
            }, { quoted: m });
        }
        try {
            const r = await pedirUtil('translate', { text: texto, to: destino });
            return sock.sendMessage(chat, {
                text: `˚₊· ͟͟͞͞➳❥ *TRADUCCIÓN*\n───────────────\n${r.translated}\n───────────────\n> Idioma: ${destino}`
            }, { quoted: m });
        } catch (e: any) {
            return sock.sendMessage(chat, { text: `✿ No pude traducir eso.\n> ${e.message}` }, { quoted: m });
        }
    }
};
