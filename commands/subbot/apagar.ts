const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

// Este comando lo atiende el subbot en su propio número (lib/subbot-mode.ts, filtrarGrupo).
// Si llega al bot principal, solo se explica cómo usarlo.
export default {
    command: ['apagar', 'encender'],
    description: 'Apaga o enciende tu subbot en este grupo (desde tu subbot)',
    category: 'subbot',
    group: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, usedPrefix } = ctx;
        const p = usedPrefix || '.';
        return sock.sendMessage(chat, {
            text: caja('APAGAR', [
                '✧ Este comando se usa desde el número de tu subbot.',
                `✦ ${p}apagar » no responde en este grupo`,
                `✦ ${p}apagar solo » solo te responde a ti`,
                `✦ ${p}apagar on » vuelve a responder`
            ])
        }, { quoted: msg });
    }
};
