import PDFDocument from 'pdfkit';
import { CertificadoData, CertificadoConfig } from '../types/index.js';
import { logInfo, logError } from '../utils/logger.js';

// Configuración por defecto del certificado
const defaultConfig: CertificadoConfig = {
  width: 595.28,  // A4 width
  height: 841.89, // A4 height
  margins: {
    top: 60,
    bottom: 60,
    left: 50,
    right: 50
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
          size: 'A4',
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
    
    // Encabezado
    this.drawHeader(doc, centerX);
    
    // Título del certificado
    this.drawTitle(doc, centerX);
    
    // Información del paciente
    this.drawPatientInfo(doc, data);
    
    // Diagnóstico y reposo
    this.drawMedicalInfo(doc, data);
    
    // Fecha y firma
    this.drawFooter(doc, data, centerX);
    
    // Marca de agua
    this.drawWatermark(doc, width, height);
  }

  private drawHeader(doc: PDFKit.PDFDocument, centerX: number): void {
    doc.fontSize(16)
       .font(this.config.fonts.title)
       .fillColor(this.config.colors.primary)
       .text('CERTIFICADO MÉDICO', centerX - 80, 80, { align: 'center', width: 160 });
    
    doc.fontSize(12)
       .font(this.config.fonts.body)
       .fillColor(this.config.colors.text)
       .text('Centro Médico Integral', centerX - 100, 110, { align: 'center', width: 200 });
  }

  private drawTitle(doc: PDFKit.PDFDocument, centerX: number): void {
    doc.fontSize(14)
       .font(this.config.fonts.title)
       .fillColor(this.config.colors.secondary)
       .text('CERTIFICADO DE REPOSO MÉDICO', centerX - 120, 150, { 
         align: 'center', 
         width: 240 
       });
  }

  private drawPatientInfo(doc: PDFKit.PDFDocument, data: CertificadoData): void {
    const startY = 200;
    const lineHeight = 25;
    
    doc.fontSize(12)
       .font(this.config.fonts.body)
       .fillColor(this.config.colors.text);

    // Información del paciente
    doc.text('Certifico que el/la Sr./Sra.:', 80, startY);
    
    doc.fontSize(14)
       .font(this.config.fonts.signature)
       .text(`${data.nombre.toUpperCase()} ${data.apellido.toUpperCase()}`, 80, startY + lineHeight);
    
    doc.fontSize(12)
       .font(this.config.fonts.body);
       
    doc.text(`DNI: ${data.dni}`, 80, startY + lineHeight * 2);
  }

  private drawMedicalInfo(doc: PDFKit.PDFDocument, data: CertificadoData): void {
    const startY = 300;
    const lineHeight = 25;
    
    doc.fontSize(12)
       .font(this.config.fonts.body)
       .fillColor(this.config.colors.text);

    // Texto médico
    doc.text('Debe guardar reposo por un período de:', 80, startY);
    
    doc.fontSize(14)
       .font(this.config.fonts.title)
       .fillColor(this.config.colors.secondary)
       .text(`${data.horasReposo} HORAS`, 80, startY + lineHeight);
    
    doc.fontSize(12)
       .font(this.config.fonts.body)
       .fillColor(this.config.colors.text);
       
    doc.text(`Código de diagnóstico: ${data.codigoDiagnostico}`, 80, startY + lineHeight * 2);
    
    doc.text('Por prescripción médica y para presentar donde corresponda.', 80, startY + lineHeight * 3);
  }

  private drawFooter(doc: PDFKit.PDFDocument, data: CertificadoData, centerX: number): void {
    const fecha = data.fechaEmision || new Date();
    const fechaStr = fecha.toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    doc.fontSize(11)
       .font(this.config.fonts.body)
       .fillColor(this.config.colors.text)
       .text(`Fecha: ${fechaStr}`, 80, 500);

    // Línea para firma
    doc.moveTo(centerX + 50, 550)
       .lineTo(centerX + 200, 550)
       .stroke();
    
    doc.fontSize(10)
       .text('Firma y Sello Médico', centerX + 50, 560, { width: 150, align: 'center' });
    
    // Información adicional
    doc.fontSize(8)
       .fillColor(this.config.colors.accent)
       .text('Mat. Médica: 12345 - CMP', centerX + 50, 580, { width: 150, align: 'center' });
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