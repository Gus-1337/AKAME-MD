import { crearToggle, FUNCIONES_GRUPO } from '../../lib/ajustes.ts';

export default crearToggle(FUNCIONES_GRUPO.find((f) => f.key === 'gacha')!);
