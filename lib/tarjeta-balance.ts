// @napi-rs/canvas se carga sólo al generar la tarjeta: si el binario no existe
// (p. ej. en Termux), el bot arranca igual y usa el respaldo de texto.
type Canvas = typeof import('@napi-rs/canvas');
let canvasMod: Canvas | null = null;
const cargarCanvas = async (): Promise<Canvas> => (canvasMod ??= await import('@napi-rs/canvas'));
import { join } from 'node:path';

const ROOT = process.cwd();
const FONTS_DIR = join(ROOT, 'assets', 'fonts');
const BANNER = join(ROOT, 'img', 'akame-banner.png');

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

const rectRedondeado = (ctx: any, x: number, y: number, w: number, h: number, r: number) => {
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

const recortarTexto = (ctx: any, texto: string, maxAncho: number) => {
    let t = texto;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxAncho) t = t.slice(0, -1);
    return t === texto ? t : t + '…';
};

export interface TarjetaBalanceData {
    nombre: string;
    efectivo: string;   // ya formateado (puede ser ∞)
    banco: string;
    total: string;
    moneda: string;
}

/** Tarjeta de balance dorada con el fondo de Akame. */
export const generarTarjetaBalance = async (d: TarjetaBalanceData): Promise<Buffer> => {
    const { createCanvas, GlobalFonts, loadImage } = await cargarCanvas();
    cargarFuentes(GlobalFonts);
    const W = 1000;
    const H = 420;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d') as any;

    // Fondo: Akame recortado al tamaño de la tarjeta
    try {
        const fondo = await loadImage(BANNER);
        const escala = Math.max(W / fondo.width, H / fondo.height);
        const fw = fondo.width * escala;
        const fh = fondo.height * escala;
        ctx.drawImage(fondo, (W - fw) / 2, (H - fh) / 2, fw, fh);
    } catch {
        ctx.fillStyle = '#1a1205';
        ctx.fillRect(0, 0, W, H);
    }

    // Capa oscura con tono dorado (más oscuro a la izquierda para leer el texto)
    const velo = ctx.createLinearGradient(0, 0, W, 0);
    velo.addColorStop(0, 'rgba(20, 12, 2, 0.92)');
    velo.addColorStop(0.55, 'rgba(40, 26, 4, 0.72)');
    velo.addColorStop(1, 'rgba(60, 40, 6, 0.25)');
    ctx.fillStyle = velo;
    ctx.fillRect(0, 0, W, H);

    // Brillo dorado arriba
    const brillo = ctx.createRadialGradient(W * 0.2, 0, 10, W * 0.2, 0, W * 0.7);
    brillo.addColorStop(0, 'rgba(255, 215, 0, 0.28)');
    brillo.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = brillo;
    ctx.fillRect(0, 0, W, H);

    // Marco dorado con degradado
    const oro = ctx.createLinearGradient(0, 0, W, H);
    oro.addColorStop(0, '#FFE58A');
    oro.addColorStop(0.5, '#D4A017');
    oro.addColorStop(1, '#8A5A00');
    ctx.lineWidth = 10;
    ctx.strokeStyle = oro;
    rectRedondeado(ctx, 14, 14, W - 28, H - 28, 34);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 240, 180, 0.9)';
    rectRedondeado(ctx, 26, 26, W - 52, H - 52, 26);
    ctx.stroke();

    const sans = 'AkameSans, sans-serif';
    const bold = 'AkameSansBold, sans-serif';
    const xTexto = 70;

    // Título
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `bold 40px ${bold}`;
    ctx.fillStyle = oro;
    ctx.fillText('✦ BALANCE ✦', xTexto, 110);

    // Nombre
    ctx.font = `bold 58px ${bold}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(255, 200, 60, 0.6)';
    ctx.shadowBlur = 18;
    ctx.fillText(recortarTexto(ctx, d.nombre, W - xTexto - 80), xTexto, 190);
    ctx.shadowBlur = 0;

    // Línea dorada
    const linea = ctx.createLinearGradient(xTexto, 0, W - 120, 0);
    linea.addColorStop(0, 'rgba(255, 215, 0, 0.95)');
    linea.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = linea;
    ctx.fillRect(xTexto, 212, W - xTexto - 120, 3);

    // Filas: efectivo, banco y total
    const filas: Array<[string, string, boolean]> = [
        ['♡ Efectivo', `${d.efectivo} ${d.moneda}`, false],
        ['♡ Banco', `${d.banco} ${d.moneda}`, false],
        ['✧ Total', `${d.total} ${d.moneda}`, true]
    ];
    filas.forEach(([etiqueta, valor, destacada], i) => {
        const y = 252 + i * 46;
        ctx.textAlign = 'left';
        ctx.font = `${destacada ? 'bold ' : ''}32px ${destacada ? bold : sans}`;
        ctx.fillStyle = destacada ? '#FFE58A' : 'rgba(255, 240, 200, 0.92)';
        ctx.fillText(etiqueta, xTexto, y);
        ctx.textAlign = 'right';
        ctx.font = `bold ${destacada ? 40 : 34}px ${bold}`;
        ctx.fillStyle = destacada ? '#FFD700' : '#FFF4D0';
        ctx.fillText(recortarTexto(ctx, valor, 520), W - 80, y);
    });

    // Pie
    ctx.textAlign = 'left';
    ctx.font = `24px ${sans}`;
    ctx.fillStyle = 'rgba(255, 230, 150, 0.8)';
    ctx.fillText("Usa .dep o .with para mover tu dinero ✿", xTexto, H - 44);

    return canvas.toBuffer('image/png');
};
