// Uso:
//   node --experimental-strip-types scripts/subbot.ts crear 51999999999
//   node --experimental-strip-types scripts/subbot.ts listar
//   node --experimental-strip-types scripts/subbot.ts borrar <id>
import { crearSubbot, listarSubbots, borrarSubbot, MAX_SUBBOTS } from '../lib/subbots.ts';

const [, , accion, arg] = process.argv;

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
    switch (accion) {
        case 'crear': {
            if (!arg) throw new Error('Falta el número. Ej: crear 51999999999');
            const { id, codigo } = await crearSubbot(arg);
            console.log(`\nSubbot creado: ${id}`);
            console.log(`Código de vinculación: ${codigo}`);
            console.log('En WhatsApp: Dispositivos vinculados → Vincular con número de teléfono → escribe el código.');
            console.log('Esperando la vinculación (máx. 90 s)... Ctrl+C para salir.\n');
            // Mantiene el proceso vivo mientras el subbot se vincula
            for (let i = 0; i < 100; i++) {
                await esperar(1000);
                const sesion = listarSubbots().find((s) => s.id === id);
                if (!sesion || sesion.estado === 'conectado') break;
            }
            const final = listarSubbots().find((s) => s.id === id);
            console.log(final ? `Estado final: ${final.estado}` : 'El subbot se borró (no se vinculó a tiempo).');
            process.exit(0);
            break;
        }
        case 'listar': {
            const lista = listarSubbots();
            console.log(`Subbots: ${lista.length}/${MAX_SUBBOTS}`);
            for (const s of lista) console.log(`- ${s.id}  ${s.numero}  ${s.estado}  (${s.creado})`);
            process.exit(0);
            break;
        }
        case 'borrar': {
            if (!arg) throw new Error('Falta el id. Ej: borrar sb-xxxx');
            borrarSubbot(arg);
            console.log(`Subbot ${arg} borrado.`);
            process.exit(0);
            break;
        }
        default:
            console.log('Uso: crear <numero> | listar | borrar <id>');
            process.exit(1);
    }
};

main().catch((e) => {
    console.error(`Error: ${e?.message || e}`);
    process.exit(1);
});
