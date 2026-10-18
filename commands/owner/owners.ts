import config from '#config';
import { leerOwnersExtra } from '../../lib/owners.ts';

// Solo el dueño del bot (owner: true lo valida el handler)
export default {
    command: ['owners'],
    description: 'Muestra los owners del bot',
    category: 'owner',
    owner: true,

    run: async ({ chat, m, sock }: any) => {
        const fijos = [...((config as any).owner || [])].map(String);
        const agregados = leerOwnersExtra().filter((n) => !fijos.includes(n));
        const todos = [...fijos, ...agregados];
        const linea = (n: string, i: number) =>
            `✐ ${i + 1}. @${n}${agregados.includes(n) ? ' _(agregado)_' : ''}`;
        const texto =
            `✦ *OWNERS DEL BOT* ✦\n\n` +
            (todos.length ? todos.map(linea).join('\n') : '✿ No hay owners.') +
            `\n\n✧ Total: ${todos.length}`;
        return sock.sendMessage(chat, {
            text: texto,
            mentions: todos.map((n) => `${n}@s.whatsapp.net`)
        }, { quoted: m });
    }
};
