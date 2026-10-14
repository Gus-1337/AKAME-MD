const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

// Este comando lo atiende el subbot en su propio número (lib/subbot-mode.ts).
// Si llega al bot principal, solo se explica cómo usarlo.
export default {
    command: ['setname'],
    description: 'Cambia el nombre de tu subbot (desde tu subbot)',
    category: 'subbot',
    run: async (ctx: any) => {
        const { sock, msg, chat } = ctx;
        return sock.sendMessage(chat, {
            text: caja('SETNAME', ['✧ Este comando se usa escribiéndolo al número de tu subbot.', '✦ Ejemplo: .setname KATA BOT'])
        }, { quoted: msg });
    }
};
