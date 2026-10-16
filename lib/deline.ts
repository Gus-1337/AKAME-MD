import axios from 'axios';

/** Deline APIs: respaldo y comandos extra. Clave pública de la documentación. */
export const DELINE_URL = 'https://api.deline.web.id';
export const DELINE_KEY = 'agasamel';

/** Arma la URL de un endpoint de Deline con sus parámetros y la clave. */
export const delineUrl = (ruta: string, params: Record<string, string> = {}): string => {
    const q = new URLSearchParams({ ...params, apikey: DELINE_KEY }).toString();
    return `${DELINE_URL}${ruta}?${q}`;
};

/** Pide un endpoint que responde JSON. */
export const delineJson = async (ruta: string, params: Record<string, string> = {}, timeout = 40000): Promise<any> => {
    const { data } = await axios.get(delineUrl(ruta, params), { timeout, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return data;
};

/** Pide un endpoint que responde una imagen o archivo y lo devuelve como Buffer. */
export const delineBytes = async (ruta: string, params: Record<string, string> = {}, timeout = 40000): Promise<Buffer> => {
    const res = await axios.get(delineUrl(ruta, params), { responseType: 'arraybuffer', timeout, headers: { 'User-Agent': 'Mozilla/5.0' } });
    return Buffer.from(res.data);
};
