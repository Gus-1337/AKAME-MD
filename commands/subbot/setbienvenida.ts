const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

// Este comando lo atiende el subbot en su propio número (lib/subbot-mode.ts).
// Si llega al bot principal, solo se explica cómo usarlo.
export default {
    command: ['setbienvenida'],
    description: 'Pone la bienvenida de tu subbot (desde tu subbot)',
    category: 'subbot',
    run: async (ctx: any) => {
        const { sock, msg, chat } = ctx;
        return sock.sendMessage(chat, {
            text: caja('SETBIENVENIDA', ['✧ Este comando se usa escribiéndolo al número de tu subbot.', '✦ Ejemplo: .setbienvenida Bienvenido {user}'])
        }, { quoted: msg });
    }
};
