import { pedirUtil } from '#popcat';

export default {
    command: ['steam'],
    description: 'Info de un juego de Steam',
    category: 'tools',
    run: async ({ chat, m, sock, args, text }: any) => {
        const juego = (args?.join(' ') || text || '').trim();
        if (!juego) {
            return sock.sendMessage(chat, { text: '   ׄ  ✿  Escribe el juego. Ej: *.steam Portal 2*' }, { quoted: m });
        }
        try {
            const s = await pedirUtil('steam', { query: juego });
            const desc = String(s.description || '').replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').slice(0, 220);
            const lineas = [
                '˚₊· ͟͟͞͞➳❥ *STEAM*',
                '───────────────',
                `🎮 *${s.name}*`,
                s.developers?.length ? `🛠️ ${s.developers.join(', ')}` : '',
                s.price ? `💲 ${s.price}` : '',
                desc ? `📝 ${desc}${String(s.description || '').length > 220 ? '…' : ''}` : '',
                '───────────────'
            ].filter(Boolean);
            return sock.sendMessage(chat, { text: lineas.join('\n') }, { quoted: m });
        } catch (e: any) {
            return sock.sendMessage(chat, { text: `✿ No encontré ese juego.\n> ${e.message}` }, { quoted: m });
        }
    }
};
