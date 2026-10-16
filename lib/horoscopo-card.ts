import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { join } from 'node:path';

const FONTS_DIR = join(process.cwd(), 'assets', 'fonts');
let fuenteLista = false;

/** Registra DejaVu (incluida en el repo) una sola vez, para que los acentos se vean igual en cualquier servidor. */
const cargarFuentes = () => {
    if (fuenteLista) return;
    try {
        GlobalFonts.registerFromPath(join(FONTS_DIR, 'DejaVuSans.ttf'), 'AkameSans');
        GlobalFonts.registerFromPath(join(FONTS_DIR, 'DejaVuSans-Bold.ttf'), 'AkameSansBold');
    } catch {
        // Si no carga, se usa la fuente del sistema.
    }
    fuenteLista = true;
};

/** Parte el texto en líneas que quepan en el ancho dado. */
const partirTexto = (ctx: any, texto: string, maxAncho: number): string[] => {
    const palabras = texto.split(/\s+/);
    const lineas: string[] = [];
    let actual = '';
    for (const palabra of palabras) {
        const prueba = actual ? `${actual} ${palabra}` : palabra;
        if (ctx.measureText(prueba).width <= maxAncho) {
            actual = prueba;
        } else {
            if (actual) lineas.push(actual);
            actual = palabra;
        }
    }
    if (actual) lineas.push(actual);
    return lineas;
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

export interface HoroscopoCardData {
    signo: string;       // ej. "ARIES"
    simbolo: string;     // ej. "♈"
    usuario: string;
    area: string;        // ej. "Amor"
    prediccion: string;
    numero: number;
    color: string;
}

/** Genera la tarjeta del horóscopo como PNG (Buffer). */
export const generarHoroscopoCard = async (d: HoroscopoCardData): Promise<Buffer> => {
    cargarFuentes();
    const W = 900;
    const H = 1100;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d') as any;

    // Fondo degradado
    const fondo = ctx.createLinearGradient(0, 0, W, H);
    fondo.addColorStop(0, '#0d0b14');
    fondo.addColorStop(0.55, '#2a0f3a');
    fondo.addColorStop(1, '#4a1030');
    ctx.fillStyle = fondo;
    ctx.fillRect(0, 0, W, H);

    // Brillos suaves
    const brillo = ctx.createRadialGradient(W * 0.8, H * 0.15, 20, W * 0.8, H * 0.15, 420);
    brillo.addColorStop(0, 'rgba(180, 90, 255, 0.35)');
    brillo.addColorStop(1, 'rgba(180, 90, 255, 0)');
    ctx.fillStyle = brillo;
    ctx.fillRect(0, 0, W, H);

    const fuente = (tam: number, negrita = false) =>
        `${negrita ? 'bold ' : ''}${tam}px ${fuenteLista ? (negrita ? 'AkameSansBold' : 'AkameSans') : 'sans-serif'}`;

    // Título
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = fuente(50, true);
    ctx.fillText('HORÓSCOPO NEGRO', W / 2, 110);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = fuente(24);
    ctx.fillText('la verdad sin filtro', W / 2, 150);

    // Símbolo grande
    ctx.fillStyle = '#e7c6ff';
    ctx.font = fuente(170);
    ctx.fillText(d.simbolo, W / 2, 330);

    // Signo y usuario
    ctx.fillStyle = '#ffffff';
    ctx.font = fuente(46, true);
    ctx.fillText(d.signo, W / 2, 405);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = fuente(26);
    ctx.fillText(d.usuario, W / 2, 445);

    // Área (etiqueta)
    ctx.font = fuente(26, true);
    const etiqueta = `✦ ${d.area.toUpperCase()} ✦`;
    const anchoEtiqueta = ctx.measureText(etiqueta).width + 60;
    ctx.fillStyle = 'rgba(180, 90, 255, 0.35)';
    rectRedondeado(ctx, W / 2 - anchoEtiqueta / 2, 480, anchoEtiqueta, 56, 28);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(etiqueta, W / 2, 518);

    // Caja de predicción
    const cajaX = 70;
    const cajaY = 575;
    const cajaW = W - 140;
    const cajaH = 330;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    rectRedondeado(ctx, cajaX, cajaY, cajaW, cajaH, 26);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = fuente(32);
    const lineas = partirTexto(ctx, `"${d.prediccion}"`, cajaW - 80);
    const alturaLinea = 46;
    const inicio = cajaY + (cajaH - lineas.length * alturaLinea) / 2 + 30;
    lineas.slice(0, 7).forEach((l, i) => ctx.fillText(l, cajaX + 40, inicio + i * alturaLinea));

    // Números
    ctx.textAlign = 'center';
    const filaY = 960;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = fuente(22);
    ctx.fillText('NÚMERO DE LA MALA SUERTE', W / 4, filaY);
    ctx.fillText('COLOR DE LA DESGRACIA', (W * 3) / 4, filaY);
    ctx.fillStyle = '#ffffff';
    ctx.font = fuente(46, true);
    ctx.fillText(String(d.numero), W / 4, filaY + 56);
    ctx.font = fuente(34, true);
    ctx.fillText(d.color, (W * 3) / 4, filaY + 56);

    // Pie
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = fuente(20);
    ctx.fillText('AKAME-MD', W / 2, H - 40);

    return canvas.encode('png');
};
