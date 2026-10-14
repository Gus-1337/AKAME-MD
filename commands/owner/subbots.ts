import { listarSubbots, buscarSubbot, borrarSubbot, getCupo, setCupo } from '../../lib/subbots.ts';

const caja = (titulo: string, lineas: string[]) =>
    `˚₊· ͟͟͞͞➳❥ *${titulo}*\n───────────────\n${lineas.join('\n')}\n───────────────\n> AKAME-MD 🌸`;

const ESTADOS: Record<string, string> = {
    emparejando: '⏳ vinculando',
    conectado: '✅ conectado',
    caido: '⚠️ caído'
};

export default {
    command: ['subbots'],
    description: 'Administra los subbots: lista, cupo y borrar (solo owner)',
    category: 'owner',
    owner: true,
    run: async (ctx: any) => {
        const { sock, msg, chat, args } = ctx;
        const [accion, valor] = args || [];
        const responder = (texto: string) => sock.sendMessage(chat, { text: texto }, { quoted: msg });

        // .subbots max <n>
        if (accion === 'max') {
            const n = Number(valor);
            try {
                setCupo(n);
            } catch (e: any) {
                return responder(caja('SUBBOTS', [`✧ ${e.message}`]));
            }
            const usados = listarSubbots().length;
            const aviso = usados > n
                ? ['⚠️ Hay más subbots que el nuevo cupo. Los actuales siguen activos; no entrarán nuevos.']
                : [];
            return responder(caja('CUPO ACTUALIZADO', [
                `✧ Nuevo cupo » ${n}`,
                `✦ Usados » ${usados}/${n}`,
                ...aviso
            ]));
        }

        // .subbots borrar <id|numero>
        if (accion === 'borrar') {
            if (!valor) return responder(caja('SUBBOTS', ['✧ Usa: .subbots borrar <id o número>']));
            const sb = buscarSubbot(valor);
            if (!sb) return responder(caja('SUBBOTS', ['✧ No encontré ese subbot.']));
            borrarSubbot(sb.id);
            return responder(caja('SUBBOT BORRADO', [`✧ ${sb.id}`, `✦ ${sb.numero}`]));
        }

        // .subbots (lista)
        const lista = listarSubbots();
        const cupo = getCupo();
        const filas = lista.length
            ? lista.map((s, i) => `${i + 1}. ${s.numero} · ${ESTADOS[s.estado] || s.estado}\n   ↳ ${s.id}`)
            : ['Todavía no hay subbots.'];

        return responder(caja('SUBBOTS', [
            `✧ Cupo » ${lista.length}/${cupo}`,
            '',
            ...filas,
            '',
            '✦ .subbots max <n> · .subbots borrar <id|número>'
        ]));
    }
};
