import ownerSetprefix from '../owner/setprefix.ts';

// En tu subbot: .setprefix <símbolo> lo atiende lib/subbot-mode.ts.
// En el bot principal: lo usa solo el dueño del bot (mismo comando de siempre).
export default {
    command: ['setprefix'],
    description: 'Cambia el prefijo (en tu subbot: tu propio prefijo)',
    category: 'subbot',
    run: async (ctx: any) => {
        if (!ctx.owner) {
            return ctx.sock.sendMessage(ctx.chat, {
                text: '🌸 Para cambiar el prefijo de tu subbot, escríbele .setprefix <símbolo> desde tu subbot.'
            }, { quoted: ctx.msg });
        }
        return ownerSetprefix.run(ctx);
    }
};
