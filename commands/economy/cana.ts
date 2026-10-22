import { generateWAMessageFromContent, prepareWAMessageMedia } from '@whiskeysockets/baileys';
import { UserJid } from '#simple';
import { ecoUser, titulo, money, bloqueadoPorAdmin } from '#shop';
import config from '#config';
import { saveDB } from '#db';
import { CANAS, CANA_POR_ID, canaDe, tieneCana, imagenDeCana, type Cana } from '../../lib/canas.ts';

const COMPRABLES = CANAS.filter((c) => c.precio > 0);

const descripcionCaña = (c: Cana, coin: string) =>
    `${c.descripcion}\n💰 ${money(c.precio)} ${coin}\n🎯 Nivel de peces grandes: ${c.muestras}/6`;

/** Carrusel con una tarjeta por caña: imagen, precio y botones para comprar o equipar. */
async function enviarCarrusel(sock: any, chat: string, quoted: any, p: string, user: any, coin: string) {
    const cards = await Promise.all(COMPRABLES.map(async (c) => {
        const foto = imagenDeCana(c);
        const media = foto ? await prepareWAMessageMedia({ image: foto }, { upload: sock.waUploadToServer }) : null;
        const dueña = tieneCana(user, c.id);
        return {
            header: {
                title: `${c.emoji} ${c.nombre}`,
                hasMediaAttachment: !!media,
                ...(media ? { imageMessage: media.imageMessage } : {})
            },
            body: { text: descripcionCaña(c, coin) },
            footer: { text: dueña ? '✓ Ya la tienes' : 'AKAME MD • Tienda de cañas' },
            nativeFlowMessage: {
                buttons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: dueña ? '🎣 Equipar' : `🛒 Comprar ${money(c.precio)}`,
                            id: dueña ? `${p}cana equipar ${c.id}` : `${p}cana comprar ${c.id}`
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({ display_text: '🎒 Mi caña', id: `${p}cana` })
                    }
                ]
            }
        };
    }));

    const cuerpo = `${titulo('CAÑAS DE PESCA')}\n\n` +
        `✧ Caña actual » *${canaDe(user).nombre}* ${canaDe(user).emoji}\n` +
        `✦ Las cañas mejores sacan peces más grandes.\n` +
        `✦ Compra con el botón y equípala para pescar.`;

    const mensaje = generateWAMessageFromContent(chat, {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    body: { text: cuerpo },
                    footer: { text: 'Desliza para ver más cañas 🌸' },
                    carouselMessage: { cards }
                }
            }
        }
    }, (quoted?.message ? { quoted } : {}) as any);

    await sock.relayMessage(chat, mensaje.message, { messageId: mensaje.key.id });
}

export default {
    command: ['cana', 'canas'],
    description: 'Tienda de cañas de pescar: compra y equipa una caña',
    category: 'economy',
    group: true,

    run: async ({ chat, m, sock, sender, args, usedPrefix, prefix }: any) => {
        const p = usedPrefix || prefix || (config as any).prefix || '.';
        const coin = (config as any)?.coin || '¥enes';
        const reply = (t: string) => sock.sendMessage(chat, { text: t }, { quoted: m });
        try {
            if (bloqueadoPorAdmin(chat)) return reply(`「 ꕤ 」 Los comandos de *Economía* están bloqueados. Un admin puede usar *${p}onlyadmin off*.`);
            const jid = await UserJid(sock, chat, sender);
            const user = ecoUser(chat, jid);
            if (!user) return reply('「 ꕤ 」 Este grupo aún no tiene economía activa.');

            const accion = String(args[0] || '').toLowerCase();
            const id = String(args[1] || '').toLowerCase();

            // Sin acción: el carrusel de cañas
            if (!accion) {
                try {
                    return await enviarCarrusel(sock, chat, m, p, user, coin);
                } catch (e) {
                    console.error('Carrusel de cañas falló:', e);
                    const lista = COMPRABLES.map((c) => `✧ ${c.emoji} *${c.nombre}* · ${money(c.precio)} ${coin}\n   ${c.descripcion}`).join('\n');
                    return reply(`${titulo('CAÑAS DE PESCA')}\n\n${lista}\n\n✦ Compra con *${p}cana comprar <nombre>*\n✦ Ejemplo: *${p}cana comprar bambu*`);
                }
            }

            const c = CANA_POR_ID[id];
            if (accion !== 'comprar' && accion !== 'equipar') {
                return reply(`「 ✿ 」 Usa *${p}cana*, *${p}cana comprar <id>* o *${p}cana equipar <id>*.`);
            }
            if (!c) {
                const ids = COMPRABLES.map((x) => x.id).join(', ');
                return reply(`「 ✿ 」 No existe esa caña.\n> Opciones: ${ids}`);
            }

            if (accion === 'equipar') {
                if (!tieneCana(user, c.id)) return reply(`「 ✿ 」 Aún no tienes *${c.nombre}*. Cómprala con *${p}cana comprar ${c.id}*.`);
                user.cana = c.id;
                saveDB(chat, jid);
                return reply(`${titulo('CAÑA EQUIPADA')}\n\n   ${c.emoji} *${c.nombre}*\n\n> Ya puedes pescar con ella 🎣`);
            }

            // comprar
            if (tieneCana(user, c.id) && c.precio > 0) {
                user.cana = c.id;
                saveDB(chat, jid);
                return reply(`${titulo('CAÑA EQUIPADA')}\n\n   ${c.emoji} *${c.nombre}*\n\n> Ya la tenías, la equipé 🎣`);
            }
            if (c.precio === 0) return reply('「 ✿ 」 Esa caña ya es tuya desde el inicio.');

            if ((user.coins || 0) < c.precio) {
                const falta = c.precio - (user.coins || 0);
                return reply(
                    `${titulo('SIN SALDO')}\n\n` +
                    `   No te alcanza para *${c.nombre}* ${c.emoji}\n\n` +
                    `♡ Precio › *${money(c.precio)}* ${coin}\n` +
                    `♡ Tienes › *${money(user.coins || 0)}* ${coin}\n` +
                    `♡ Te faltan › *${money(falta)}* ${coin}`
                );
            }

            user.coins -= c.precio;
            if (!Array.isArray(user.canas)) user.canas = [];
            user.canas.push(c.id);
            user.cana = c.id;
            saveDB(chat, jid);

            const foto = imagenDeCana(c);
            const texto = `${titulo('COMPRA HECHA')}\n\n   ${c.emoji} *${c.nombre}*\n\n` +
                `♡ Pagaste › *${money(c.precio)}* ${coin}\n` +
                `♡ Saldo › *${money(user.coins)}* ${coin}\n` +
                `♡ Peces grandes › nivel *${c.muestras}/6*\n\n` +
                `> Ya está equipada. Pesca con *${p}pescar* 🎣`;
            if (foto) return sock.sendMessage(chat, { image: foto, caption: texto }, { quoted: m });
            return reply(texto);
        } catch (e) {
            console.error('Error en cana:', e);
            return reply('「 ꕤ 」 Ocurrió un error con las cañas.');
        }
    }
};
