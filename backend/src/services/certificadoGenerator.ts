import PDFDocument from 'pdfkit';
import path from 'path';
import { CertificadoData, CertificadoConfig } from '../types/index.js';
import { logInfo, logError } from '../utils/logger.js';

// Configuración por defecto del certificado
const defaultConfig: CertificadoConfig = {
  width: 283.46,   // 10 cm en puntos (10 cm * 28.346 pts/cm)
  height: 535.28,  // 21 cm en puntos (21 cm * 28.346 pts/cm)
  margins: {
    top: 25,       // Márgenes más pequeños para el formato reducido
    bottom: 25,
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
    doc.moveTo(0, 410)
       .lineTo(width, 410)
       .strokeColor('#000000')
       .lineWidth(0.5)
       .stroke();
  }

  private drawHeader(doc: PDFKit.PDFDocument, _centerX: number): void {
    // Header con información del médico (ajustado para formato pequeño)
    doc.fontSize(12) // Tamaño de fuente más pequeño
       .font(this.config.fonts.title)
       .fillColor('#000000')
       .text('Dra. Kardasz Ivana Noelia', 10, 15, { align: 'center', width: 263 });
    
    doc.fontSize(10) // Tamaño de fuente más pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('ESPECIALISTA CLINICA GENERAL', 10, 30, { align: 'center', width: 263 });
       
    doc.fontSize(10) // Tamaño de fuente más pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('M.P. 7532', 10, 45, { align: 'center', width: 263 });
       
    // Número de receta en la esquina superior izquierda
    doc.fontSize(10) // Tamaño de fuente más pequeño
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('Rp /', 10, 90);
  }

  private drawPatientInfo(doc: PDFKit.PDFDocument, data: CertificadoData): void {
    // Variables de posición para cada línea - EDITA AQUÍ LAS POSICIONES
    const constanciaY = 120;
    const constanciaX = 25;
    
    const nombreY = 140;
    const nombreX = 25;
    
    const dniY = 160;
    const dniX = 25;
    
    const consultaY = 180;
    const consultaX = 25;
    
    const presentarY = 200;
    const presentarX = 25;
    
    doc.fontSize(10)
       .font(this.config.fonts.body)
       .fillColor('#000000');

    // Texto del certificado según el formato solicitado
    doc.text('Dejo constancia que el/la', constanciaX, constanciaY);
    
    // ==================== LÍNEA DE PUNTOS PARA NOMBRE ====================
    doc.text('Sr/a ', nombreX, nombreY, { continued: true });
    const nombreCompleto = `${data.nombre.toUpperCase()} ${data.apellido.toUpperCase()}`;
    const nombreStartX = doc.x; // Posición donde termina "Sr/a "
    doc.text(nombreCompleto);
    
    // Línea de puntos debajo del nombre
    const nombreWidth = doc.widthOfString(nombreCompleto);
    const espacioDisponibleNombre = 200;
    const puntosNombre = '.'.repeat(Math.floor((espacioDisponibleNombre - nombreWidth) / 3));
    console.log(`NOMBRE: Inicio X=${nombreStartX}, Ancho texto=${nombreWidth}, Puntos generados=${puntosNombre.length}`);
    doc.text(puntosNombre, nombreStartX, nombreY + 0.5);
    // ================================================================

    // ==================== LÍNEA DE PUNTOS PARA DNI ====================
    doc.text('DNI: ', dniX, dniY, { continued: true });
    const dniStartX = doc.x; // Posición donde termina "DNI: "
    doc.text(`${data.dni},`);
    
    // Línea de puntos debajo del DNI
    const dniWidth = doc.widthOfString(data.dni + ',');
    const espacioDisponibleDni = 100;
    const puntosDni = '.'.repeat(Math.floor((espacioDisponibleDni - dniWidth) / 3));
    console.log(`DNI: Inicio X=${dniStartX}, Ancho texto=${dniWidth}, Puntos generados=${puntosDni.length}`);
    doc.text(puntosDni, dniStartX, dniY + 0.5);
    // ================================================================

    doc.text('consulta el día de la fecha', consultaX, consultaY);
    
    // Línea "por presentar" (sin puntos, como en el ejemplo real)
    doc.text('por presentar ', presentarX, presentarY, { continued: true });
    const descripcion = data.textoEntrada || 'síndrome gripal';
    doc.text(`${descripcion},`);
  }

  private drawMedicalInfo(doc: PDFKit.PDFDocument, data: CertificadoData): void {
    // Variables de posición para cada línea - EDITA AQUÍ LAS POSICIONES
    const reposoY = 220;
    const reposoX = 25;
    
    const diagnosticoY = 240;
    const diagnosticoX = 25;
    
    // FIRMA DIGITALIZADA - Posición superior derecha del certificado
    const firmaY = 260;
    const firmaX = 160;
    
    doc.fontSize(10)
       .font(this.config.fonts.body)
       .fillColor('#000000');

    // Línea de reposo con puntos
    doc.text('se sugiere reposo por ', reposoX, reposoY, { continued: true });
    doc.text(`${data.horasReposo}hs.`);
    
    // Línea de diagnóstico con puntos
    doc.text('Diag: ', diagnosticoX, diagnosticoY, { continued: true });
    doc.text(`${data.codigoDiagnostico}`);
    
    // Firma digitalizada de la doctora
    this.drawDigitalSignature(doc, firmaX, firmaY);
  }

  private drawFooter(doc: PDFKit.PDFDocument, data: CertificadoData, _centerX: number): void {
    // Variables de posición para cada línea - EDITA AQUÍ LAS POSICIONES
    const fechaY = 380;
    const fechaX = 25;
    
    const contactoY = 430;
    const contactoX = 10;
    
    const whatsappY = 445;
    const whatsappX = 10;
    
    const ubicacionY = 460;
    const ubicacionX = 10;

    const leyendaCamScannerY = 490;
    const leyendaCamScannerX = 10;
    
    const fecha = data.fechaEmision || new Date();
    const day = fecha.getDate().toString().padStart(2, '0');
    const month = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const year = fecha.getFullYear();
    const fechaStr = `${day}/${month}/${year}`;

    // Fecha del certificado
    doc.fontSize(10)
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text(fechaStr, fechaX, fechaY);

    // Información de contacto
    doc.fontSize(10)
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('Contacto 3794062059', contactoX, contactoY, { align: 'center', width: 263 });
       
    doc.fontSize(10)
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('(Solo Whatsapp)', whatsappX, whatsappY, { align: 'center', width: 263 });
       
    doc.fontSize(10)
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('San Bernardo - Chaco', ubicacionX, ubicacionY, { align: 'center', width: 263 });

    doc.fontSize(8)
       .font(this.config.fonts.body)
       .fillColor('#000000')
       .text('Escaneado con CamScanner', leyendaCamScannerX, leyendaCamScannerY, { align: 'right', width: 263 });
  }

  private drawDigitalSignature(doc: PDFKit.PDFDocument, x: number, y: number): void {
    try {
      // Usar la imagen de firma digitalizada - ruta relativa desde la carpeta backend
      const firmaPath = './assets/firmaDigital.jpeg';
      
      console.log('Intentando cargar firma desde:', firmaPath);
      console.log('Directorio actual:', process.cwd());
      
      // Agregar la imagen de firma digitalizada
      doc.image(firmaPath, x, y - 30, { 
        width: 100, 
        height: 60,
        fit: [100, 60], // Mantiene la proporción dentro de estos límites
        align: 'center'
      });
      
      console.log('Firma digitalizada cargada exitosamente');
         
    } catch (error) {
      console.log('No se pudo cargar la firma digitalizada:', error);
      logError('Error al cargar firma digitalizada', error as Error);
      
      // Fallback: texto simple si no se puede cargar la imagen
      doc.fontSize(8)
         .fillColor('#000000')
         .text('Kardasz Ivana Noelia', x, y - 15, { width: 100, align: 'center' });
      
      doc.fontSize(7)
         .fillColor('#000000')
         .text('Especialista', x, y - 5, { width: 100, align: 'center' });
      
      doc.fontSize(6)
         .fillColor('#000000')
         .text('Medicina General y Familiar', x, y + 5, { width: 100, align: 'center' });
      
      doc.fontSize(7)
         .fillColor('#000000')
         .text('M.P. 7532', x, y + 15, { width: 100, align: 'center' });
    }
  }

  private drawWatermark(doc: PDFKit.PDFDocument, width: number, height: number): void {
    // Guardar estado gráfico
    doc.save();
    
    // Configurar transparencia y rotación para marca de agua
    // doc.opacity(0.1)
    //    .fontSize(48)
    //    .font(this.config.fonts.body)
    //    .fillColor('#999999');
    
    // // Rotar y posicionar marca de agua
    // doc.rotate(-45, { origin: [width / 2, height / 2] })
    //    .text('Escaneado con CamScanner', width / 2 - 200, height / 2, {
    //      align: 'center',
    //      width: 400
    //    });
    
    // Restaurar estado gráfico
    doc.restore();
  }
}