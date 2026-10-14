import { UserJid } from '#simple';
import config from '#config';
import { saveDB } from '#db';
import { titulo, money, ecoUser, bloqueadoPorAdmin } from '#shop';

// CONFIGURACIÓN DEL BANCO
const MIN_LOAN = 1000;
const MAX_LOAN = 100000;
const INTEREST = 0.15; // 15%
const MIN_DAYS = 1;
const MAX_DAYS = 30;
const DEFAULT_DAYS = 7;

const fechaCorta = (d: Date) => d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export default {
    command: ['loan', 'prestamo', 'prestar'],
    description: 'Pide un préstamo al banco y paga con interés',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, args, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });

        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const realSender = await UserJid(sock, chat, sender);
            const user = ecoUser(chat, realSender);
            if (!user) return reply('「 ꕤ 」 Error: La base de datos no está inicializada.');
            const coin = (config as any)?.coin || '¥enes';
            const fmt = (n: number) => `${money(n)} ${coin}`;

            // Pagar la deuda
            const sub = String(args[0] || '').toLowerCase();
            if (sub === 'pagar' || sub === 'pay' || sub === 'abonar') {
                if (!user.loan) return reply(`${titulo('PRÉSTAMO')}\n\n   No tienes deudas pendientes ✅`);

                const arg1 = String(args[1] || '').toLowerCase();
                let pagar: number;
                if (arg1 === 'all' || arg1 === 'todo') {
                    pagar = user.loan.remaining;
                } else {
                    pagar = parseInt(arg1.replace(/[^0-9]/g, ''));
                    if (!pagar || pagar <= 0) {
                        return reply(`「 ꕤ 」 Indica cuánto pagar.\n> Ejemplo » *${p}loan pagar 5000*\n> Ejemplo » *${p}loan pagar all*`);
                    }
                }
                if ((user.coins || 0) < pagar) {
                    return reply(`「 ꕤ 」 No tienes suficiente efectivo. Tienes *${fmt(user.coins || 0)}*.`);
                }

                user.coins -= pagar;
                user.loan.remaining -= pagar;

                if (user.loan.remaining <= 0) {
                    const total = user.loan.totalDebt;
                    delete user.loan;
                    saveDB(chat, realSender);
                    return reply(
                        `${titulo('DEUDA PAGADA')}\n\n` +
                        `   ¡Gracias! Liquidaste tu préstamo de *${fmt(total)}*\n\n` +
                        `✩ Efectivo › *${fmt(user.coins)}*`
                    );
                }

                saveDB(chat, realSender);
                return reply(
                    `${titulo('ABONO')}\n\n` +
                    `✩ Abonaste › *${fmt(pagar)}*\n` +
                    `✩ Te falta › *${fmt(user.loan.remaining)}*\n` +
                    `✩ Vence › *${user.loan.dueDateStr}*`
                );
            }

            // Ya tiene una deuda
            if (user.loan) {
                const dias = Math.ceil((user.loan.dueTimestamp - Date.now()) / (1000 * 60 * 60 * 24));
                return reply(
                    `${titulo('DEUDA PENDIENTE')}\n\n` +
                    `✩ Debes › *${fmt(user.loan.remaining)}* de *${fmt(user.loan.totalDebt)}*\n` +
                    `✩ Vence › *${user.loan.dueDateStr}* (${dias > 0 ? `en ${dias} días` : '¡VENCIDO!'})\n\n` +
                    `> Paga con *${p}loan pagar <cantidad|all>*`
                );
            }

            // Pedir préstamo: .loan <cantidad> [días]
            const cantidad = parseInt(String(args[0] || '').replace(/[^0-9]/g, ''));
            let dias = parseInt(String(args[1] || '').replace(/[^0-9]/g, '')) || DEFAULT_DAYS;

            if (!cantidad) {
                return reply(
                    `${titulo('PRÉSTAMOS')}\n\n` +
                    `   Presta dinero y paga con *${INTEREST * 100}%* de interés\n\n` +
                    `✧ Pedir › *${p}loan <cantidad> [días]*\n` +
                    `✧ Pagar › *${p}loan pagar <cantidad|all>*\n\n` +
                    `✩ Mínimo › *${fmt(MIN_LOAN)}*\n` +
                    `✩ Máximo › *${fmt(MAX_LOAN)}*\n` +
                    `✩ Plazo › *${MIN_DAYS} a ${MAX_DAYS} días* (por defecto ${DEFAULT_DAYS})`
                );
            }

            if (cantidad < MIN_LOAN) return reply(`「 ꕤ 」 El préstamo mínimo es *${fmt(MIN_LOAN)}*.`);
            if (cantidad > MAX_LOAN) return reply(`「 ꕤ 」 El préstamo máximo es *${fmt(MAX_LOAN)}*.`);
            if (dias < MIN_DAYS) dias = MIN_DAYS;
            if (dias > MAX_DAYS) dias = MAX_DAYS;

            const interes = Math.floor(cantidad * INTEREST);
            const totalDeuda = cantidad + interes;
            const vence = new Date();
            vence.setDate(vence.getDate() + dias);

            user.coins = (user.coins || 0) + cantidad;
            user.loan = {
                amount: cantidad,
                interest: interes,
                totalDebt: totalDeuda,
                remaining: totalDeuda,
                days: dias,
                borrowedAt: new Date().toLocaleString('es-ES'),
                dueTimestamp: vence.getTime(),
                dueDateStr: fechaCorta(vence)
            };
            saveDB(chat, realSender);

            return reply(
                `${titulo('PRÉSTAMO APROBADO')}\n\n` +
                `✩ Recibiste › *${fmt(cantidad)}*\n` +
                `✩ Interés › *${fmt(interes)}* (${INTEREST * 100}%)\n` +
                `✩ Total a pagar › *${fmt(totalDeuda)}*\n` +
                `✩ Plazo › *${dias} días*\n` +
                `✩ Vence › *${user.loan.dueDateStr}*\n\n` +
                `> Si no pagas a tiempo se cobrará del banco\n` +
                `> Paga con *${p}loan pagar all*`
            );
        } catch (e) {
            console.error('Error en loan:', e);
            return reply('「 ꕤ 」 Ocurrió un error en el préstamo.');
        }
    }
};
