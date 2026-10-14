import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const execPromise = promisify(exec);

const MAX_ARCHIVOS = 20;
const LINEA = '┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄';

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
        const { reply } = ctx;

        try {
            const { stdout: antes } = await execPromise('git rev-parse HEAD');
            const { stdout } = await execPromise('git pull');
            const { stdout: despues } = await execPromise('git rev-parse HEAD');
            const rootDir = path.join(process.cwd(), 'commands');

            if (!(global as any).plugins) {
                (global as any).plugins = {};
            }

            const reload = async (dir: string) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    const stat = fs.statSync(fullPath);

                    if (stat.isDirectory()) {
                        await reload(fullPath);
                    } else if (file.endsWith('.ts') && !file.startsWith('_')) {
                        try {
                            const fileUrl = pathToFileURL(fullPath).href + `?update=${Date.now()}`;
                            const module = await import(fileUrl);
                            const cmd = module.default || module;

                            if (cmd) {
                                const pluginKey = path.relative(rootDir, fullPath).replace(/\\/g, '/');
                                (global as any).plugins[pluginKey] = cmd;
                            }
                        } catch (e) {}
                    }
                }
            };

            (global as any).plugins = {};
            await reload(rootDir);

            const inicio = antes.trim();
            const fin = despues.trim();

            if (inicio === fin || stdout.includes('Already up to date')) {
                return reply(
                    `❀ *SISTEMA AL DÍA* ❀\n` +
                    `${LINEA}\n` +
                    `✿ El bot ya tiene la última versión.`
                );
            }

            const { stdout: cambios } = await execPromise(`git diff --name-status ${inicio} ${fin}`);
            const { stdout: autor } = await execPromise('git log -1 --format=%an');

            const lineas = cambios.split('\n').map(l => l.trim()).filter(Boolean);
            const archivos = lineas.map(l => {
                const [estado, ...rutas] = l.split('\t');
                const etiqueta = ESTADOS[estado[0]] || '✎ cambiado';
                return `› ${rutas.join(' → ')}  ${etiqueta}`;
            });

            const mostrados = archivos.slice(0, MAX_ARCHIVOS);
            const extra = archivos.length - mostrados.length;

            return reply(
                `❀ *ACTUALIZACIÓN EXITOSA* ❀\n` +
                `${LINEA}\n` +
                `亗 *Editor:* ${autor.trim() || 'Desconocido'}\n` +
                `✎ *Total cambios:* ${archivos.length}\n` +
                `ꕥ *Archivos:*\n` +
                '```' + mostrados.join('\n') + (extra > 0 ? `\n… y ${extra} más` : '') + '```\n' +
                `${LINEA}\n` +
                `> Comandos recargados sin reiniciar el bot`
            );

        } catch (err: any) {
            await reply(`✿ No se pudo actualizar\n> ${err.message || err.toString()}`);
        }
    }
};
