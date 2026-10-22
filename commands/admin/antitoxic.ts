import { saveDB } from '#db';
import { BASE, MAX_ADVERTENCIAS, MINUTOS_SILENCIO, MAX_PALABRAS_EXTRA, normalizar, extrasDe, caja } from '../../lib/antitoxic.ts';

const TAM_MENSAJE = 1500; // caracteres por mensaje al listar palabras

export default {
    command: ['antitoxic', 'antitoxico'],
    description: 'Borra groserías, avisa con advertencias y silencia al 3º aviso',
    category: 'admin',
    group: true,
    admin: true,
    botAdmin: true,

    run: async (ctx: any): Promise<any> => {
        const { chat, m, args, usedPrefix, command, sock } = ctx;
        const reply = (txt: string) => m.reply ? m.reply(txt) : sock.sendMessage(chat, { text: txt }, { quoted: m });

        if (!global.db?.data) return reply('✿ Error: DB no inicializada.');
        if (!global.db.data.chats) global.db.data.chats = {};
        if (!global.db.data.chats[chat]) global.db.data.chats[chat] = {};

        const chatDb = global.db.data.chats[chat];
        const input = args[0]?.toLowerCase();
        const resto = args.slice(1).join(' ').trim();
        const estado = chatDb.antitoxic ? 'Activado ✓' : 'Desactivado ✗';
        const p = usedPrefix + command;

        if (!input) {
            return reply(caja('ANTITOXIC', [
                `✧ Activar » *${p} on*`,
                `✧ Desactivar » *${p} off*`,
                `✧ Agregar palabra » *${p} add <palabra>*`,
                `✧ Quitar palabra » *${p} del <palabra>*`,
                `✧ Quitar advertencias » *${p} quitaradv @usuario*`,
                `✧ Ver todas » *${p} lista*`,
                `✦ Estado » *${estado}*`,
                `✦ ${MAX_ADVERTENCIAS} advertencias y silencio de ${MINUTOS_SILENCIO} min.`
            ]));
        }

        if (['on', '1', 'enable', 'activar'].includes(input)) {
            chatDb.antitoxic = true;
            saveDB(chat);
            return reply(caja('ANTITOXIC', ['✓ Activado.', `✦ ${MAX_ADVERTENCIAS} advertencias y silencio de ${MINUTOS_SILENCIO} min.`]));
        }

        if (['off', '0', 'disable', 'desactivar'].includes(input)) {
            chatDb.antitoxic = false;
            saveDB(chat);
            return reply(caja('ANTITOXIC', ['✗ Desactivado.']));
        }

        if (['add', 'agregar', 'añadir', 'anadir'].includes(input)) {
            const nueva = normalizar(resto);
            if (!nueva) return reply(caja('ANTITOXIC', [`✧ Escribe la palabra: *${p} add <palabra>*`]));
            if (nueva.length > 40) return reply(caja('ANTITOXIC', ['✧ La palabra es muy larga (máx. 40 letras).']));
            chatDb.palabrasToxicas = chatDb.palabrasToxicas || [];
            if (extrasDe(chatDb).includes(nueva) || BASE.includes(nueva)) {
                return reply(caja('ANTITOXIC', [`✧ *${nueva}* ya está en la lista.`]));
            }
            if (chatDb.palabrasToxicas.length >= MAX_PALABRAS_EXTRA) {
                return reply(caja('ANTITOXIC', [`✧ Ya hay ${MAX_PALABRAS_EXTRA} palabras propias. Quita alguna primero.`]));
            }
            chatDb.palabrasToxicas.push(nueva);
            saveDB(chat);
            return reply(caja('ANTITOXIC', [`✓ Agregada » *${nueva}*`, `✦ Total propias » ${chatDb.palabrasToxicas.length}`]));
        }

        if (['del', 'quitar', 'eliminar', 'borrar'].includes(input)) {
            const quitar = normalizar(resto);
            if (!quitar) return reply(caja('ANTITOXIC', [`✧ Escribe la palabra: *${p} del <palabra>*`]));
            const lista = chatDb.palabrasToxicas || [];
            if (!lista.map(normalizar).includes(quitar)) {
                return reply(caja('ANTITOXIC', [`✧ *${quitar}* no está en las palabras propias del grupo.`]));
            }
            chatDb.palabrasToxicas = lista.filter((x: string) => normalizar(x) !== quitar);
            saveDB(chat);
            return reply(caja('ANTITOXIC', [`✗ Quitada » *${quitar}*`]));
        }

        if (['quitaradv', 'quitaradvertencias', 'perdonar', 'unwarn'].includes(input)) {
            // Objetivo: mención, respuesta al mensaje o número escrito
            const ctxInfo = m.message?.extendedTextMessage?.contextInfo;
            const objetivo: string | undefined = ctxInfo?.mentionedJid?.[0]
                || ctxInfo?.quotedMessage?.key?.participant
                || ctxInfo?.quotedMessage?.key?.sender
                || (args[1] && args[1].replace(/\D/g, '') ? args[1].replace(/\D/g, '') + '@s.whatsapp.net' : undefined);
            if (!objetivo) {
                return reply(caja('ANTITOXIC', [`✧ Menciona a la persona, responde a su mensaje o escribe su número.`, `✦ Ejemplo: *${p} quitaradv @usuario*`]));
            }

            const num = (j: string) => String(j).split('@')[0].split(':')[0].replace(/\D/g, '');
            const quien = num(objetivo);
            const advs = chatDb.advertenciasToxicas || {};
            const silen = chatDb.silenciados || {};
            const claves = (obj: Record<string, any>) => Object.keys(obj).filter((k) => num(k) === quien);

            const tenia = claves(advs).reduce((t, k) => t + (advs[k] || 0), 0);
            const estabaSilenciado = claves(silen).length > 0;
            claves(advs).forEach((k) => delete advs[k]);
            claves(silen).forEach((k) => delete silen[k]);
            chatDb.advertenciasToxicas = advs;
            chatDb.silenciados = silen;
            saveDB(chat);

            const etiqueta = `@${quien}`;
            if (!tenia && !estabaSilenciado) {
                return sock.sendMessage(chat, { text: caja('ANTITOXIC', [`✧ ${etiqueta} no tiene advertencias.`]), mentions: [objetivo] }, { quoted: m });
            }
            return sock.sendMessage(chat, {
                text: caja('ANTITOXIC', [
                    `✓ Advertencias de ${etiqueta} quitadas.`,
                    tenia ? `✦ Antes » *${tenia}/${MAX_ADVERTENCIAS}*${estabaSilenciado ? ' · silenciado' : ''}` : '✦ Estaba silenciado',
                    estabaSilenciado ? '✦ También se quitó el silencio.' : ''
                ].filter(Boolean)),
                mentions: [objetivo]
            }, { quoted: m });
        }

        if (['lista', 'list', 'ver'].includes(input)) {
            const propias = extrasDe(chatDb);
            const todas = [...BASE, ...propias];
            await reply(caja('ANTITOXIC', [
                `✦ Base » ${BASE.length} palabras`,
                `✦ Propias » ${propias.length}`,
                `✦ Total » ${todas.length}`,
                '✦ Lista completa en los mensajes siguientes 🌸'
            ]));
            // Se parte en mensajes para que no sea un bloque enorme
            let bloque = '';
            const partes: string[] = [];
            for (const palabra of todas) {
                const marca = propias.includes(palabra) ? `${palabra} ✧` : palabra;
                if ((bloque + ' ' + marca).length > TAM_MENSAJE) { partes.push(bloque); bloque = ''; }
                bloque = bloque ? `${bloque} · ${marca}` : marca;
            }
            if (bloque) partes.push(bloque);
            for (let i = 0; i < partes.length; i++) {
                await sock.sendMessage(chat, { text: `*${i + 1}/${partes.length}*\n${partes[i]}\n\n✧ = palabra propia del grupo` }, { quoted: m });
            }
            return;
        }

        return reply(caja('ANTITOXIC', [`✧ No entendí. Usa *${p}* para ver las opciones.`]));
    }
};
