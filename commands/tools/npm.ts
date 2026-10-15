import { pedirUtil } from '#popcat';

export default {
    command: ['npm'],
    description: 'Info de un paquete de npm',
    category: 'tools',
    run: async ({ chat, m, sock, args }: any) => {
        const paquete = (args?.[0] || '').trim();
        if (!paquete) {
            return sock.sendMessage(chat, { text: '   ׄ  ✿  Escribe el paquete. Ej: *.npm axios*' }, { quoted: m });
        }
        try {
            const p = await pedirUtil('npm', { q: paquete });
            return sock.sendMessage(chat, {
                text: [
                    '˚₊· ͟͟͞͞➳❥ *NPM*',
                    '───────────────',
                    `📦 *${p.name}* v${p.version}`,
                    `📝 ${p.description || 'Sin descripción'}`,
                    `👤 ${p.author || 'Desconocido'}`,
                    `📅 Última publicación: ${p.last_published}`,
                    `⬇️ Descargas este año: ${p.downloads_this_year}`,
                    p.repository ? `🔗 ${p.repository}` : '',
                    '───────────────'
                ].filter(Boolean).join('\n')
            }, { quoted: m });
        } catch (e: any) {
            return sock.sendMessage(chat, { text: `✿ No encontré ese paquete.\n> ${e.message}` }, { quoted: m });
        }
    }
};
