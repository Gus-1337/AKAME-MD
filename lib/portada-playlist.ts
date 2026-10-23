// @napi-rs/canvas se carga sólo al generar la portada: si el binario no existe
// (p. ej. en Termux), se manda el texto como respaldo.
type Canvas = typeof import('@napi-rs/canvas');
let canvasMod: Canvas | null = null;
const cargarCanvas = async (): Promise<Canvas> => (canvasMod ??= await import('@napi-rs/canvas'));
import { join } from 'node:path';

const FONTS_DIR = join(process.cwd(), 'assets', 'fonts');
let fuenteLista = false;
const cargarFuentes = (GlobalFonts: Canvas['GlobalFonts']) => {
    if (fuenteLista) return;
    try {
        GlobalFonts.registerFromPath(join(FONTS_DIR, 'DejaVuSans.ttf'), 'AkameSans');
        GlobalFonts.registerFromPath(join(FONTS_DIR, 'DejaVuSans-Bold.ttf'), 'AkameSansBold');
    } catch {
        // Si no carga, se usa la fuente del sistema.
    }
    fuenteLista = true;
};

const rect = (ctx: any, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
};

const recortar = (ctx: any, texto: string, maxAncho: number) => {
    let t = texto;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxAncho) t = t.slice(0, -1);
    return t === texto ? t : t + '…';
};

export interface PortadaPlaylistData {
    tema: string;
    canciones: string[];     // títulos ya listos
    miniatura: Buffer | null; // miniatura del primer resultado
}

/** Portada de la playlist: miniatura del primer resultado, tema y las canciones. */
export const generarPortadaPlaylist = async (d: PortadaPlaylistData): Promise<Buffer> => {
    const { createCanvas, GlobalFonts, loadImage } = await cargarCanvas();
    cargarFuentes(GlobalFonts);
    const W = 1000;
    const H = 560;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d') as any;

    let mini: any = null;
    if (d.miniatura) { try { mini = await loadImage(d.miniatura); } catch { mini = null; } }

    // Fondo: la miniatura cubriendo todo, con velo azul oscuro
    if (mini) {
        const escala = Math.max(W / mini.width, H / mini.height);
        const fw = mini.width * escala;
        const fh = mini.height * escala;
        try { ctx.filter = 'blur(16px)'; } catch { /* sin blur */ }
        ctx.drawImage(mini, (W - fw) / 2, (H - fh) / 2, fw, fh);
        try { ctx.filter = 'none'; } catch { /* */ }
    } else {
        ctx.fillStyle = '#06142e';
        ctx.fillRect(0, 0, W, H);
    }
    const velo = ctx.createLinearGradient(0, 0, W, H);
    velo.addColorStop(0, 'rgba(4, 14, 44, 0.92)');
    velo.addColorStop(1, 'rgba(10, 40, 100, 0.78)');
    ctx.fillStyle = velo;
    ctx.fillRect(0, 0, W, H);

    // Marco degradado azul
    const marco = ctx.createLinearGradient(0, 0, W, H);
    marco.addColorStop(0, '#9FE3FF');
    marco.addColorStop(0.5, '#3A8DFF');
    marco.addColorStop(1, '#1B3FA0');
    ctx.lineWidth = 10;
    ctx.strokeStyle = marco;
    rect(ctx, 14, 14, W - 28, H - 28, 34);
    ctx.stroke();

    // Miniatura en la izquierda, con borde y sombra
    const mx = 60, my = 100, ms = 340;
    ctx.save();
    ctx.shadowColor = 'rgba(90, 170, 255, 0.8)';
    ctx.shadowBlur = 30;
    rect(ctx, mx, my, ms, ms, 26);
    ctx.fillStyle = '#0a1e44';
    ctx.fill();
    ctx.restore();
    if (mini) {
        ctx.save();
        rect(ctx, mx, my, ms, ms, 26);
        ctx.clip();
        const escala = Math.max(ms / mini.width, ms / mini.height);
        const fw = mini.width * escala;
        const fh = mini.height * escala;
        ctx.drawImage(mini, mx + (ms - fw) / 2, my + (ms - fh) / 2, fw, fh);
        ctx.restore();
    }
    ctx.lineWidth = 6;
    ctx.strokeStyle = marco;
    rect(ctx, mx, my, ms, ms, 26);
    ctx.stroke();

    const sans = 'AkameSans, sans-serif';
    const bold = 'AkameSansBold, sans-serif';
    const xTexto = 440;
    const anchoTexto = W - xTexto - 50;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `bold 36px ${bold}`;
    ctx.fillStyle = '#9FE3FF';
    ctx.fillText('PLAYLIST', xTexto, 120);

    ctx.font = `bold 50px ${bold}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(90, 170, 255, 0.7)';
    ctx.shadowBlur = 16;
    ctx.fillText(recortar(ctx, d.tema, anchoTexto), xTexto, 180);
    ctx.shadowBlur = 0;

    // Línea
    const linea = ctx.createLinearGradient(xTexto, 0, W - 50, 0);
    linea.addColorStop(0, 'rgba(120, 190, 255, 0.95)');
    linea.addColorStop(1, 'rgba(120, 190, 255, 0)');
    ctx.fillStyle = linea;
    ctx.fillRect(xTexto, 200, anchoTexto, 3);

    // Canciones
    ctx.font = `28px ${sans}`;
    d.canciones.slice(0, 5).forEach((titulo, i) => {
        const y = 250 + i * 56;
        ctx.fillStyle = '#6EC8FF';
        ctx.font = `bold 28px ${bold}`;
        ctx.fillText(`${i + 1}.`, xTexto, y);
        ctx.fillStyle = '#EAF5FF';
        ctx.font = `28px ${sans}`;
        ctx.fillText(recortar(ctx, titulo, anchoTexto - 50), xTexto + 46, y);
    });

    ctx.font = `22px ${sans}`;
    ctx.fillStyle = 'rgba(190, 225, 255, 0.85)';
    ctx.fillText('Canciones en MP3 como documento', xTexto, H - 46);

    return canvas.toBuffer('image/png');
};
