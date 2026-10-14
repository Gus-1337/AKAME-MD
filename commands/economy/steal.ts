import { GANANCIA_BASE } from '#shop';
import { UserJid } from '#simple';
import { buffRemaining, formatDuration, hasRobShield, luckBoost, softenPenalty, titulo, money, ecoUser, bloqueadoPorAdmin } from '#shop';
import { saveDB } from '#db';
import config from '#config';

const soloDigitos = (x: string) => String(x).split('@')[0].split(':').pop()?.replace(/[^\d]/g, '') || '';

export default {
    command: ['rob', 'steal', 'robar'],
    description: 'Roba monedas a otro usuario inactivo',
    category: 'economy',
    group: true,
    run: async ({ chat, m, sock, usedPrefix, prefix, sender }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });
        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const dbData = (global as any).db?.data;
            if (!dbData) return reply('「 ꕤ 」 Error: La base de datos no está inicializada.');
            const coin = (config as any)?.coin || '¥enes';

            const realSender = await UserJid(sock, chat, sender);
            const ctxInfo = m.message?.extendedTextMessage?.contextInfo;
            const mentionedJid = ctxInfo?.mentionedJid?.[0];
            const quotedSender = ctxInfo?.quotedMessage?.key?.sender;
            const participant = ctxInfo?.participant;

            let targetJid: string | null = null;
            if (mentionedJid) targetJid = await UserJid(sock, chat, mentionedJid);
            else if (quotedSender) targetJid = await UserJid(sock, chat, quotedSender);
            else if (participant) targetJid = await UserJid(sock, chat, participant);

            if (!targetJid) return reply(`「 ꕤ 」 Menciona o responde a quien quieres robarle.\n> Ejemplo » *${p}rob @usuario*`);
            if (targetJid === realSender) return reply(`「 ꕤ 」 No puedes robarte a ti mismo.`);

            const user = ecoUser(chat, realSender);
            const chatUsers = dbData.chats[chat].users;

            const now = Date.now();
            const cooldown = 10 * 60 * 1000;
            const diff = now - (user.lastRob || 0);
            if (user.lastRob && diff < cooldown) {
                return reply(`「 ꕤ 」 Los vecinos te vigilan, espera *${formatDuration(cooldown - diff)}* para usar *${p}rob* de nuevo.`);
            }

            let victima = chatUsers[targetJid];
            let victimaKey = targetJid;
            if (!victima) {
                const num = soloDigitos(targetJid);
                for (const [k, v] of Object.entries(chatUsers)) {
                    if (soloDigitos(k) === num) { victima = v; victimaKey = k; break; }
                }
            }
            if (!victima) return reply(`「 ꕤ 」 Ese usuario no tiene cuenta de economía en este grupo.`);

            const ultimaVez = (victima as any).lastSeen || (victima as any).lastCommand || 0;
            const inactivo = ultimaVez > 0 && (now - ultimaVez) > 60 * 60 * 1000;
            if (!inactivo) return reply(`「 ꕤ 」 Solo puedes robarle a alguien que lleve más de *1 hora* inactivo.`);

            const nombreVictima = dbData.users?.[victimaKey]?.name || victimaKey.split('@')[0];
            if (hasRobShield(victima)) {
                return reply(`🛡️ *${nombreVictima}* tiene un *escudo antirrobo* activo por *${formatDuration(buffRemaining(victima, 'robprotect'))}* más.`);
            }

            const saldoVictima = victima.coins || 0;
            if (saldoVictima < 100) {
                return reply(`「 ꕤ 」 *${nombreVictima}* no tiene suficiente efectivo para valer la pena.`);
            }

            user.lastRob = now;
            const exitoso = Math.random() < luckBoost(user, 0.5);

            if (exitoso) {
                const porcentaje = Math.random() * 0.3 + 0.1;
                const robado = Math.min(Math.floor(saldoVictima * porcentaje), saldoVictima);
                const botin = robado * GANANCIA_BASE;
                user.coins = (user.coins || 0) + botin;
                victima.coins = saldoVictima - robado;
                saveDB(chat, realSender);
                saveDB(chat, victimaKey);
                return reply(
                    `${titulo('ROBO')}\n\n` +
                    `   ¡Le robaste a *${nombreVictima}*!\n\n` +
                    `♡ Ganaste › *+${money(botin)}* ${coin}\n` +
                    `♡ Saldo › *${money(user.coins)}* ${coin}`
                );
            }

            const perdida = softenPenalty(user, Math.min(user.coins || 0, Math.floor(Math.random() * 5000) + 1000));
            user.coins = (user.coins || 0) - perdida;
            saveDB(chat, realSender);
            return reply(
                `${titulo('ROBO')}\n\n` +
                `   Te atraparon en el intento\n\n` +
                `♡ Perdiste › *-${money(perdida)}* ${coin}\n` +
                `♡ Saldo › *${money(user.coins)}* ${coin}`
            );
        } catch (e) {
            console.error('Error en rob:', e);
            return reply('「 ꕤ 」 Ocurrió un error al intentar robar.');
        }
    }
};
