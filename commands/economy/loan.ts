import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';

const normalizeNumber = (x: string) => {
    if (!x) return '';
    let cleaned = String(x).split('@')[0].split(':').pop() || '';
    cleaned = cleaned.replace(/[^\d]/g, '');
    return cleaned;
};

export default {
    command: ['loan', 'prestamo', 'prestar'],
    description: 'Pide un préstamo',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || config.prefix || '.';
        const reply = (txt: string) => sock.sendMessage(chat, { text: txt }, { quoted: m });

        try {
            const realSender = await UserJid(sock, chat, sender);
            const dbData = (global as any).db?.data;
            if (!dbData.chats) dbData.chats = {};
            if (!dbData.chats[chat]) dbData.chats[chat] = {};
            const chatDb = dbData.chats[chat];
            const chatUsers = chatDb.users || (chatDb.users = {});

            let userInChat = chatUsers[realSender];
            if (!userInChat) {
                const num = normalizeNumber(realSender);
                for (const [k, v] of Object.entries(chatUsers)) {
                    if (normalizeNumber(k) === num) { userInChat = v; break; }
                }
            }
            if (!userInChat) {
                userInChat = chatUsers[realSender] = { coins: 0, bank: 0 };
            }

            const coinName = (config as any)?.coin || '¥enes';
            const fmt = (n: number) => `${n.toLocaleString()} ${coinName}`;

            // CONFIGURACIÓN DEL BANCO
            const MIN_LOAN = 1000;
            const MAX_LOAN = 100000; // límite máximo
            const INTEREST = 0.15; // 15% de interés
            const MIN_DAYS = 1;
            const MAX_DAYS = 30;
            const DEFAULT_DAYS = 7;

            // Si escribe.loan pagar
            const sub = (args[0] || '').toLowerCase();
            if (sub === 'pagar' || sub === 'pay' || sub === 'abonar') {
                if (!userInChat.loan) return reply(`✿ No tienes ninguna deuda pendiente.`);

                let amountToPay: number;
                if (args[1]?.toLowerCase() === 'all' || args[1]?.toLowerCase() === 'todo') {
                    amountToPay = userInChat.loan.remaining;
                } else {
                    amountToPay = parseInt(args[1]?.replace(/[^0-9]/g, ''));
                    if (!amountToPay || amountToPay <= 0) return reply(`✿ Debes poner cuánto quieres pagar\nEj: *${p}loan pagar 5000*\nEj: *${p}loan pagar all*`);
                }

                if (userInChat.coins < amountToPay) return reply(`✿ No tienes suficiente efectivo. Tienes ${fmt(userInChat.coins)} pero quieres pagar ${fmt(amountToPay)}`);

                userInChat.coins -= amountToPay;
                userInChat.loan.remaining -= amountToPay;

                if (userInChat.loan.remaining <= 0) {
                    const totalPagado = userInChat.loan.totalDebt;
                    delete userInChat.loan;
                    saveDB(chat, realSender);
                    return reply(`✩.･:｡≻───── ⋆💰⋆ ─────.•:｡✩\n\n✅ *¡Deuda pagada!* ✅\n\nGracias por pagar tu préstamo de *${fmt(totalPagado)}*\nYa puedes pedir otro cuando quieras 💖\n\n✩.･:｡≻───── ⋆💰⋆ ─────.•:｡✩`);
                } else {
                    saveDB(chat, realSender);
                    return reply(`✅ Abonaste *${fmt(amountToPay)}* a tu deuda.\n\nTe falta por pagar: *${fmt(userInChat.loan.remaining)}*\nVence: ${userInChat.loan.dueDateStr}`);
                }
            }

            // Si ya tiene préstamo
            if (userInChat.loan) {
                const diasRestantes = Math.ceil((new Date(userInChat.loan.dueTimestamp) - new Date()) / (1000 * 60 * 60 * 24));
                return reply(
`「 ⚠️ 」 *¡Ya tienes una deuda pendiente!*

💰 Debes: *${fmt(userInChat.loan.remaining)}* de *${fmt(userInChat.loan.totalDebt)}*
📅 Vence: *${userInChat.loan.dueDateStr}* (${diasRestantes > 0? `en ${diasRestantes} días` : '¡VENCIDO!'})
> Paga con: *${p}loan pagar <cantidad|all>*`
                );
            }

            // Pedir préstamo:.loan 5000 7
            const cantidad = parseInt((args[0] || '').replace(/[^0-9]/g, ''));
            let dias = parseInt((args[1] || '').replace(/[^0-9]/g, '')) || DEFAULT_DAYS;

            if (!cantidad) {
                return reply(
`✿ *SISTEMA DE PRÉSTAMOS* ✿

> Presta dinero y paga con interés del ${INTEREST*100}%

📌 Uso:
» *${p}loan <cantidad> [días]*
» *${p}loan pagar <cantidad|all>*

Ejemplos:
» *${p}loan 10000*
» *${p}loan 50000 7*
» *${p}loan pagar 5000*
» *${p}loan pagar all*

Límites:
• Mínimo: ${fmt(MIN_LOAN)}
• Máximo: ${fmt(MAX_LOAN)}
• Días: ${MIN_DAYS} a ${MAX_DAYS} días (por defecto ${DEFAULT_DAYS})`
                );
            }

            if (cantidad < MIN_LOAN) return reply(`✿ El préstamo mínimo es de *${fmt(MIN_LOAN)}*`);
            if (cantidad > MAX_LOAN) return reply(`✿ El préstamo máximo es de *${fmt(MAX_LOAN)}*`);
            if (dias < MIN_DAYS) dias = MIN_DAYS;
            if (dias > MAX_DAYS) dias = MAX_DAYS;

            const interes = Math.floor(cantidad * INTEREST);
            const totalDeuda = cantidad + interes;

            const fechaVencimiento = new Date();
            fechaVencimiento.setDate(fechaVencimiento.getDate() + dias);

            userInChat.coins = (userInChat.coins || 0) + cantidad;
            userInChat.loan = {
                amount: cantidad,
                interest: interes,
                totalDebt: totalDeuda,
                remaining: totalDeuda,
                days: dias,
                borrowedAt: new Date().toLocaleString('es-ES'),
                dueTimestamp: fechaVencimiento.getTime(),
                dueDateStr: fechaVencimiento.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
            };

            saveDB(chat, realSender);

            await sock.sendMessage(chat, {
                text: `✩.･:｡≻───── ⋆🏦⋆ ─────.•:｡✩\n\n💰 *¡Préstamo aprobado!* 💰\n\n» Recibiste: *${fmt(cantidad)}*\n» Interés (${INTEREST*100}%): *${fmt(interes)}*\n» Total a pagar: *${fmt(totalDeuda)}*\n» Plazo: *${dias} días*\n» Vence: *${userInChat.loan.dueDateStr}*\n\n> Si no pagas a tiempo se te cobrará automáticamente del banco\n> Paga con: *${p}loan pagar all*\n\n✩.･:｡≻───── ⋆🏦⋆ ─────.•:｡✩`
            }, { quoted: m });

        } catch (e) {
            console.error('Error en loan:', e);
            await sock.sendMessage(chat, { text: '「 ꕤ 」 Ocurrió un error en el préstamo.' }, { quoted: m });
        }
    }
};