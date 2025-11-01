import PDFDocument from 'pdfkit';
import { CertificadoData, CertificadoConfig } from '../types/index.js';
import { logInfo, logError } from '../utils/logger.js';

// Configuración por defecto del certificado
const defaultConfig: CertificadoConfig = {
  width: 283.46,   // 10 cm en puntos (10 cm * 28.346 pts/cm)
  height: 595.28,  // 21 cm en puntos (21 cm * 28.346 pts/cm)
  margins: {
    top: 20,       // Márgenes más pequeños para el formato reducido
    bottom: 20,
    left: 20,
    right: 20
  },
  colors: {
    primary: '#1976d2',
    secondary: '#dc004e',
    text: '#333333',
    accent: '#666666'
  },
  fonts: {
    title: 'Helvetica-Bold',
    body: 'Helvetica',
    signature: 'Helvetica-Oblique'
  }
};

export class CertificadoGenerator {
  private config: CertificadoConfig;

  constructor(config?: Partial<CertificadoConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  async generateCertificado(data: CertificadoData): Promise<Buffer> {
    logInfo('Iniciando generación de certificado', { 
      dni: data.dni,
      data: data,
      config: this.config
    });

    return new Promise((resolve, reject) => {
      try {
        console.log('Configurando documento PDF con tamaño:', {
          width: this.config.width,
          height: this.config.height,
          margins: this.config.margins
        });

        const doc = new PDFDocument({
          size: [this.config.width, this.config.height], // Tamaño personalizado 10cm x 21cm
          margins: this.config.margins
        });

        const chunks: Buffer[] = [];

        // Recolectar chunks del PDF
        doc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          logInfo('Certificado generado exitosamente', { 
            dni: data.dni, 
            bufferSize: pdfBuffer.length 
          });
          resolve(pdfBuffer);
        });

        doc.on('error', (error: Error) => {
          logError('Error al generar certificado', error);
          reject(error);
        });

        // Generar contenido del certificado
        this.drawCertificado(doc, data);

        // Finalizar el documento
        doc.end();

      } catch (error) {
        logError('Error inesperado al generar certificado', error as Error);
        reject(error);
      }
    });
  }

  private drawCertificado(doc: PDFKit.PDFDocument, data: CertificadoData): void {
    const { width, height } = this.config;
    const centerX = width / 2;
    
    // Agregar imagen de fondo del recetario médico
    this.drawBackgroundImage(doc, width, height);
    
    // Encabezado con información del médico
    this.drawHeader(doc, centerX);
    
    // Información del paciente
    this.drawPatientInfo(doc, data);
    
    // Diagnóstico y reposo
    this.drawMedicalInfo(doc, data);
    
    // Fecha y firma
    this.drawFooter(doc, data, centerX);
    
    // Marca de agua
    this.drawWatermark(doc, width, height);
  }

  private drawBackgroundImage(doc: PDFKit.PDFDocument, width: number, height: number): void {
    // Dibujar el fondo del recetario médico similar a la imagen
    
    // Fondo blanco
    doc.rect(0, 0, width, height)
       .fillColor('#ffffff')
       .fill();
    
    // BORDES DEL CERTIFICADO
    // Borde izquierdo grueso (como en el recetario)
    doc.rect(0, 0, 2, height)
       .fillColor('#000000')
       .fill();
    
    // Borde derecho
    doc.rect(width - 1, 0, 1, height)
       .fillColor('#000000')
       .fill();
    
    // Borde superior
    doc.rect(0, 0, width, 1)
       .fillColor('#000000')
       .fill();
    
    // Borde inferior
    doc.rect(0, height - 1, width, 1)
       .fillColor('#000000')
       .fill();
    
    // Línea horizontal superior (después del header)
    doc.moveTo(0, 70)
       .lineTo(width, 70)
       .strokeColor('#000000')
       .lineWidth(0.5)
       .stroke();
       
    // Línea horizontal inferior (antes del footer)
    doc.moveTo(0, 480)
       .lineTo(width, 480)
       .strokeColor('#000000')
       .lineWidth(0.5)
       .stroke();
  }

  private drawHeader(doc: PDFKit.PDFDocument, _centerX: number): void {
    // Header con información del médico (ajustado para formato pequeño)
    doc.fontSize(10) // Tamaño de fuente más pequeño
       .font(this.config.fonts.title)
       .fillColor('#000000')
       .text('Dra. Kardasz Ivana Noelia', 10, 15, { align: 'center', width: 263 });
    
    doc.fontSize(8) // Tamaño de fuente más pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('ESPECIALISTA CLINICA GENERAL', 10, 30, { align: 'center', width: 263 });
       
    doc.fontSize(7) // Tamaño de fuente más pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('M.P. 7532', 10, 45, { align: 'center', width: 263 });
       
    // Número de receta en la esquina superior izquierda
    doc.fontSize(9) // Tamaño de fuente más pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('Rp /', 10, 90);
  }

  private drawPatientInfo(doc: PDFKit.PDFDocument, data: CertificadoData): void {
    const startY = 110; // Empezar más arriba
    const lineHeight = 22; // Espaciado aumentado para evitar solapamiento
    
    doc.fontSize(9) // Tamaño de fuente más pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000'); // Color negro para mejor contraste

    // Texto del certificado según el formato solicitado
    doc.text('Dejo constancia que el/la', 25, startY);
    
    // ==================== LÍNEA DE PUNTOS PARA NOMBRE ====================
    // INICIO: después de "Sr/a " (posición X calculada dinámicamente)
    // FIN: hasta el margen derecho (aproximadamente X=260 para formato 10cm)
    // CÁLCULO: (260 - posición_inicial) / 2.5 = cantidad de puntos (ajustado para texto más pequeño)
    doc.text('Sr/a ', 25, startY + lineHeight, { continued: true });
    const nombreCompleto = `${data.nombre.toUpperCase()} ${data.apellido.toUpperCase()}`;
    const nombreX = doc.x; // Posición donde termina "Sr/a "
    doc.text(nombreCompleto);
    
    // Línea de puntos debajo del nombre
    const nombreWidth = doc.widthOfString(nombreCompleto);
    const espacioDisponibleNombre = 200; // Espacio ajustado para formato pequeño
    const puntosNombre = '.'.repeat(Math.floor((espacioDisponibleNombre - nombreWidth) / 2.5));
    console.log(`NOMBRE: Inicio X=${nombreX}, Ancho texto=${nombreWidth}, Puntos generados=${puntosNombre.length}`);
    doc.text(puntosNombre, nombreX, startY + lineHeight + 2); // Separación de 2pts
    // ================================================================

    // ==================== LÍNEA DE PUNTOS PARA DNI ====================
    // INICIO: después de "DNI: " (posición X calculada dinámicamente)  
    // FIN: hasta X=150 aproximadamente (ajustado para formato pequeño)
    // CÁLCULO: (150 - posición_inicial) / 2.5 = cantidad de puntos
    doc.text('DNI: ', 25, startY + lineHeight * 2, { continued: true });
    const dniX = doc.x; // Posición donde termina "DNI: "
    doc.text(`${data.dni},`);
    
    // Línea de puntos debajo del DNI
    const dniWidth = doc.widthOfString(data.dni + ',');
    const espacioDisponibleDni = 100; // Espacio ajustado para formato pequeño
    const puntosDni = '.'.repeat(Math.floor((espacioDisponibleDni - dniWidth) / 2.5));
    console.log(`DNI: Inicio X=${dniX}, Ancho texto=${dniWidth}, Puntos generados=${puntosDni.length}`);
    doc.text(puntosDni, dniX, startY + lineHeight * 2 + 2); // Separación de 2pts
    // ================================================================

    doc.text('consulta el día de la fecha', 25, startY + lineHeight * 3);
    
    // ==================== LÍNEA DE PUNTOS PARA DESCRIPCIÓN ====================
    // INICIO: después de "por presentar " (posición X calculada dinámicamente)
    // FIN: hasta X=250 aproximadamente (ajustado para formato pequeño)
    // CÁLCULO: (250 - posición_inicial) / 2.5 = cantidad de puntos
    doc.text('por presentar ', 25, startY + lineHeight * 4, { continued: true });
    const descripcion = data.textoEntrada || 'síndrome gripal';
    const descripcionX = doc.x; // Posición donde termina "por presentar "
    doc.text(`${descripcion},`);
    
    // Línea de puntos debajo de la descripción
    const descripcionWidth = doc.widthOfString(descripcion + ',');
    const espacioDisponibleDescripcion = 180; // Espacio ajustado para formato pequeño
    const puntosDescripcion = '.'.repeat(Math.floor((espacioDisponibleDescripcion - descripcionWidth) / 2.5));
    console.log(`DESCRIPCIÓN: Inicio X=${descripcionX}, Ancho texto=${descripcionWidth}, Puntos generados=${puntosDescripcion.length}`);
    doc.text(puntosDescripcion, descripcionX, startY + lineHeight * 4 + 2); // Separación de 2pts
    // ================================================================
  }

  private drawMedicalInfo(doc: PDFKit.PDFDocument, data: CertificadoData): void {
    const startY = 198; // Ajustado para el nuevo espaciado
    const lineHeight = 22; // Espaciado aumentado para evitar solapamiento
    
    doc.fontSize(9) // Tamaño de fuente más pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000');

    // ==================== LÍNEA DE PUNTOS PARA REPOSO ====================
    // INICIO: después de "se sugiere reposo por " (posición X calculada dinámicamente)
    // FIN: hasta X=200 aproximadamente (ajustado para formato pequeño)
    // CÁLCULO: (200 - posición_inicial) / 2.5 = cantidad de puntos
    doc.text('se sugiere reposo por ', 25, startY, { continued: true });
    const horasTexto = `${data.horasReposo} horas`;
    const reposoX = doc.x; // Posición donde termina "se sugiere reposo por "
    doc.text(horasTexto);
    
    // Línea de puntos debajo del reposo
    const reposoWidth = doc.widthOfString(horasTexto);
    const espacioDisponibleReposo = 120; // Espacio ajustado para formato pequeño
    const puntosReposo = '.'.repeat(Math.floor((espacioDisponibleReposo - reposoWidth) / 2.5));
    console.log(`REPOSO: Inicio X=${reposoX}, Ancho texto=${reposoWidth}, Puntos generados=${puntosReposo.length}`);
    doc.text(puntosReposo, reposoX, startY + 2); // Separación de 2pts
    // ================================================================

    // Espacio adicional antes del diagnóstico
    doc.text('', 25, startY + lineHeight);
    
    // ==================== LÍNEA DE PUNTOS PARA DIAGNÓSTICO ====================
    // INICIO: después de "Diag: " (posición X calculada dinámicamente)
    // FIN: hasta X=200 aproximadamente (ajustado para formato pequeño)
    // CÁLCULO: (200 - posición_inicial) / 2.5 = cantidad de puntos
    doc.text('Diag: ', 25, startY + lineHeight * 2, { continued: true });
    const diagnosticoX = doc.x; // Posición donde termina "Diag: "
    doc.text(data.codigoDiagnostico);
    
    // Línea de puntos debajo del diagnóstico
    const diagnosticoWidth = doc.widthOfString(data.codigoDiagnostico);
    const espacioDisponibleDiagnostico = 150; // Espacio ajustado para formato pequeño
    const puntosDiagnostico = '.'.repeat(Math.floor((espacioDisponibleDiagnostico - diagnosticoWidth) / 2.5));
    console.log(`DIAGNÓSTICO: Inicio X=${diagnosticoX}, Ancho texto=${diagnosticoWidth}, Puntos generados=${puntosDiagnostico.length}`);
    doc.text(puntosDiagnostico, diagnosticoX, startY + lineHeight * 2 + 2); // Separación de 2pts
    // ================================================================
  }

  private drawFooter(doc: PDFKit.PDFDocument, data: CertificadoData, centerX: number): void {
    const fecha = data.fechaEmision || new Date();
    const fechaStr = fecha.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Fecha del certificado en el área principal (antes de la firma)
    doc.fontSize(8) // Tamaño de fuente pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text(`Buenos Aires, ${fechaStr}`, 25, 280); // Posición ajustada para el nuevo espaciado

    // Línea para firma (más pequeña y más arriba)
    doc.moveTo(centerX - 40, 320) // Ajustado para el nuevo espaciado
       .lineTo(centerX + 40, 320)
       .strokeColor('#000000')
       .lineWidth(0.5)
       .stroke();
    
    doc.fontSize(7) // Tamaño de fuente pequeño
       .fillColor('#000000')
       .text('Firma y Sello Médico', centerX - 40, 325, { width: 80, align: 'center' });

    // Información de contacto en el pie (en la parte inferior del documento)
    const footerY = 500; // Posición ajustada para estar cerca del final del documento
    
    doc.fontSize(7) // Tamaño de fuente muy pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('Contacto 3794062059', 10, footerY, { align: 'center', width: 263 });
       
    doc.fontSize(6) // Tamaño de fuente muy pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('(Solo Whatsapp)', 10, footerY + 10, { align: 'center', width: 263 });
       
    doc.fontSize(7) // Tamaño de fuente muy pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('San Bernardo - Chaco', 10, footerY + 20, { align: 'center', width: 263 });
  }

  private drawWatermark(doc: PDFKit.PDFDocument, width: number, height: number): void {
    // Guardar estado gráfico
    doc.save();
    
    // Configurar transparencia y rotación para marca de agua
    doc.opacity(0.1)
       .fontSize(48)
       .font(this.config.fonts.body)
       .fillColor('#999999');
    
    // Rotar y posicionar marca de agua
    doc.rotate(-45, { origin: [width / 2, height / 2] })
       .text('Escaneado con CamScanner', width / 2 - 200, height / 2, {
         align: 'center',
         width: 400
       });
    
    // Restaurar estado gráfico
    doc.restore();
  }
}