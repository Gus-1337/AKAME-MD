import fs from 'fs';
import path from 'path';

// Carga el .env de la carpeta del bot antes que todo lo demás (los imports se ejecutan primero).
// No pisa variables que ya existan en el panel. Así funciona aunque el servidor arranque con index.ts directo.
const ruta = path.resolve(process.cwd(), '.env');

if (fs.existsSync(ruta)) {
    try {
        if (typeof (process as any).loadEnvFile === 'function') {
            (process as any).loadEnvFile(ruta);
        } else {
            for (const linea of fs.readFileSync(ruta, 'utf8').split('\n')) {
                const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
                if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
            }
        }
        console.log('[ENV] .env cargado');
    } catch (e: any) {
        console.log('[ENV] no se pudo leer .env:', e?.message);
    }
}
