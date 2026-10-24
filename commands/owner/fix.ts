import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const execPromise = promisify(exec);

const MAX_ARCHIVOS = 20;
const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';
// git nunca debe esperar a una persona (credenciales, editor de merge)
const ENTORNO_GIT = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_EDITOR: 'true', GIT_MERGE_AUTOEDIT: 'no' };
const OPCIONES_GIT = { env: ENTORNO_GIT, timeout: 120000, maxBuffer: 10 * 1024 * 1024 };

const ESTADOS: Record<string, string> = {
    A: '✚ nuevo',
    M: '✎ editado',
    D: '✖ eliminado',
    R: '↻ renombrado',
    C: '⎘ copiado',
    T: '✎ tipo cambiado'
};

export default {
    command: ['fix', 'pull', 'update'],
    description: 'Actualiza el bot con git pull y recarga los comandos',
    category: 'owner',
    owner: true,
    run: async (ctx: any) => {
        const { sock, chat, msg } = ctx;
        const reply = (texto: string) =>
            ctx.reply ? ctx.reply(texto) : sock.sendMessage(chat, { text: texto }, { quoted: msg });

        try {
            const { stdout: antes } = await execPromise('git rev-parse HEAD', OPCIONES_GIT);
            // Usa la rama actual y el remoto origin, así funciona aunque no tenga "tracking"
            const { stdout: rama } = await execPromise('git rev-parse --abbrev-ref HEAD', OPCIONES_GIT);
            // Merge explícito y sin editor: así git no se queda esperando un mensaje
            const { stdout } = await execPromise(
                `git pull --no-rebase --no-edit origin ${rama.trim()}`,
                OPCIONES_GIT
            );
            const { stdout: despues } = await execPromise('git rev-parse HEAD', OPCIONES_GIT);

            const inicio = antes.trim();
            const fin = despues.trim();
            const sinCambios = inicio === fin || /Already up to date|Already up-to-date/i.test(stdout);

            // Recarga los comandos. Si un archivo no carga, se conserva la versión anterior
            // en lugar de dejar el comando fuera del bot.
            if (!sinCambios) {
                await recargarComandos();
            }

            if (sinCambios) {
                return reply(
                    `❀ *SISTEMA AL DÍA* ❀\n` +
                    `${LINEA}\n` +
                    `✿ El bot ya tiene la última versión.`
                );
            }

            const { stdout: cambios } = await execPromise(`git diff --name-status ${inicio} ${fin}`, OPCIONES_GIT);
            const { stdout: autor } = await execPromise('git log -1 --format=%an', OPCIONES_GIT);

            const lineas = cambios.split('\n').map(l => l.trim()).filter(Boolean);
            const archivos = lineas.map(l => {
                const [estado, ...rutas] = l.split('\t');
                const etiqueta = ESTADOS[estado[0]] || '✎ cambiado';
                return `› ${rutas.join(' → ')}  ${etiqueta}`;
            });

            const mostrados = archivos.slice(0, MAX_ARCHIVOS);
            const extra = archivos.length - mostrados.length;
            const bloque = mostrados.length
                ? '```' + mostrados.join('\n') + (extra > 0 ? `\n… y ${extra} más` : '') + '```\n'
                : '';

            return reply(
                `❀ *ACTUALIZACIÓN EXITOSA* ❀\n` +
                `${LINEA}\n` +
                `亗 *Editor:* ${autor.trim() || 'Desconocido'}\n` +
                `✎ *Total cambios:* ${archivos.length}\n` +
                `ꕥ *Archivos:*\n` +
                bloque +
                `${LINEA}\n` +
                `> Comandos recargados sin reiniciar el bot`
            );

        } catch (err: any) {
            console.error('Error en fix:', err);
            const detalle = String(err?.stderr || err?.message || err).split('\n').find(l => l.trim()) || 'Error desconocido';
            await reply(`✿ No se pudo actualizar\n> ${detalle.slice(0, 200)}`);
        }
    }
};

/** Carga cada comando de nuevo. Si un archivo falla, se mantiene el comando anterior. */
async function recargarComandos(): Promise<void> {
    const rootDir = path.join(process.cwd(), 'commands');
    const anteriores: Record<string, any> = (global as any).plugins || {};
    const nuevos: Record<string, any> = {};
    const ts = Date.now();

    const reload = async (dir: string): Promise<void> => {
        for (const file of fs.readdirSync(dir)) {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                await reload(fullPath);
            } else if ((file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts') && !file.startsWith('_')) {
                const nombre = path.basename(fullPath);
                try {
                    const fileUrl = pathToFileURL(fullPath).href + `?update=${ts}`;
                    const module: any = await import(fileUrl);
                    const cmd = module.default?.default || module.default || module;
                    if (cmd) nuevos[nombre] = cmd;
                } catch (e: any) {
                    console.error(`[ FIX ] No se pudo cargar ${file}:`, e?.message || e);
                    if (anteriores[nombre]) nuevos[nombre] = anteriores[nombre];
                }
            }
        }
    };

    await reload(rootDir);

    if (Object.keys(nuevos).length > 0) {
        (global as any).plugins = nuevos;
    }
}
