/** Código que el lanzador (scripts/lanzar.mjs) interpreta como "reinicia el bot". */
export const RESTART_CODE = 42;

export default {
    command: ['restart', 'reiniciar', 'reboot'],
    description: 'Reinicia el bot desde WhatsApp (solo owner)',
    category: 'owner',
    owner: true,
    run: async (ctx: any) => {
        const { sock, chat, msg } = ctx;
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: msg });

        await reply(
            `˚₊· ͟͟͞͞➳❥ *REINICIANDO* ✦\n\n` +
            `   Vuelvo en unos segundos...\n\n` +
            `> Si no vuelvo, revisa el servidor`
        );

        // La base de datos se guarda en cada cambio, así que no se pierde nada al cerrar
        setTimeout(() => process.exit(RESTART_CODE), 1500);
    }
};
