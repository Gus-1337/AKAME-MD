// Cliente mínimo para la API de utilidades (sin clave). Devuelve `message` o lanza error.
const BASE = 'https://api.popcat.xyz/v2';

export const pedirUtil = async (ruta: string, params: Record<string, string>): Promise<any> => {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${BASE}/${ruta}?${qs}`, { signal: AbortSignal.timeout(20000) });
    const data: any = await res.json().catch(() => null);
    // Algunos endpoints marcan error:true aunque traen el resultado en message (ej. morse).
    const fallo = !res.ok || !data || (data.error === true && (typeof data.message === 'string' || !!data.message?.error));
    if (fallo) throw new Error(data?.message?.error || data?.message || `HTTP ${res.status}`);
    return data.message;
};
