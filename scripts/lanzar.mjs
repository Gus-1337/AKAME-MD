#!/usr/bin/env node
/**
 * AKAME-MD - Lanzador
 * ---------------------------------------------------------------
 * El bot corre TypeScript directo (sin compilar) y usa node:sqlite.
 * En Node 22 esos dos extras siguen detras de flags; en Node 23+
 * ya vienen activados por defecto.
 *
 * Este lanzador detecta tu version de Node y agrega SOLO los flags
 * que hacen falta, asi `npm start` funciona igual en:
 *   - Node 22.6.0  -> 22.17.x  (ambos flags)
 *   - Node 22.13+              (solo type stripping)
 *   - Node 22.18+              (ninguno)
 *   - Node 23 / 24 / 25+       (ninguno)
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [MAJOR, MINOR] = process.versions.node.split('.').map(Number);

const alMenos = (maj, min) => MAJOR > maj || (MAJOR === maj && MINOR >= min);

if (!alMenos(22, 6)) {
    console.error(
        `\n  ✖ AKAME-MD necesita Node.js >= 22.6.0 y tienes ${process.versions.node}\n` +
        `    Actualiza con:  nvm install 22 && nvm use 22   (PC)\n` +
        `                    pkg install nodejs -y           (Termux)\n`
    );
    process.exit(1);
}

const flags = [];

// TypeScript sin compilar (type stripping): activo por defecto desde 22.18.0 / 23.6.0
const tsPorDefecto = alMenos(22, 18) || alMenos(23, 6);
if (!tsPorDefecto) flags.push('--experimental-strip-types');

// node:sqlite: sin flag desde 22.13.0 / 23.4.0
const sqlitePorDefecto = alMenos(22, 13) || alMenos(23, 4);
if (!sqlitePorDefecto) flags.push('--experimental-sqlite');

if (process.argv.includes('--dev')) flags.push('--watch');

// Argumentos extra (--qr, code) se pasan a index.ts; --dev es solo del lanzador.
const extra = process.argv.slice(2).filter((a) => a !== '--dev');
const args = [...flags, '--disable-warning=ExperimentalWarning', path.join(ROOT, 'index.ts'), ...extra];

if (flags.length > 0 && process.env.AKAME_DEBUG === '1') {
    console.log(`[lanzador] Node ${process.versions.node} -> node ${flags.join(' ')} index.ts`);
}

// Código de reinicio: el comando .restart sale con 42 y el bot vuelve a arrancar solo.
const CODIGO_REINICIO = 42;

const arrancar = () => {
    const hijo = spawn(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });

    hijo.on('exit', (code, signal) => {
        if (!signal && code === CODIGO_REINICIO) {
            console.log('\n[lanzador] Reiniciando AKAME-MD...\n');
            return arrancar();
        }
        process.exit(signal ? 1 : code ?? 0);
    });
};

arrancar();
