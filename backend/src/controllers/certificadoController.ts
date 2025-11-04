import { Request, Response } from 'express';
import { CertificadoGenerator } from '../services/certificadoGenerator.js';
import { CertificadoValidator } from '../utils/validator.js';
import { logInfo, logError } from '../utils/logger.js';
import { ApiResponse, CertificadoData } from '../types/index.js';
import { ValidationError, InternalServerError } from '../middleware/errorHandler.js';

export class CertificadoController {
  private certificadoGenerator: CertificadoGenerator;

  constructor() {
    this.certificadoGenerator = new CertificadoGenerator();
  }

  // Generar certificado PDF
  async generateCertificado(req: Request, res: Response): Promise<void> {
    try {
      logInfo('Iniciando generación de certificado', { 
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        body: req.body
      });

      // Sanitizar datos de entrada
      console.log('Datos originales:', req.body);
      const sanitizedData = CertificadoValidator.sanitizeData(req.body);
      console.log('Datos sanitizados:', sanitizedData);
      
      // Validar datos
      logInfo('Validando datos sanitizados', sanitizedData);
      const validation = CertificadoValidator.validateCertificadoData(sanitizedData);
      console.log('Resultado de validación:', validation);
      
      if (!validation.isValid) {
        const errorMessage = validation.errors?.join(', ') || 'Datos inválidos';
        logError('Validación fallida', { errors: validation.errors });
        throw new ValidationError(errorMessage);
      }

      const certificadoData = validation.data as CertificadoData;
      
      // Agregar fecha de emisión si no está presente
      if (!certificadoData.fechaEmision) {
        certificadoData.fechaEmision = new Date();
      }

      // Generar PDF
      const pdfBuffer = await this.certificadoGenerator.generateCertificado(certificadoData);

      // Generar nombre de archivo con nombre y apellido del paciente
      const nombreLimpio = certificadoData.nombre.replace(/[^a-zA-Z0-9]/g, '');
      const apellidoLimpio = certificadoData.apellido.replace(/[^a-zA-Z0-9]/g, '');
      const fechaStr = new Date().toISOString().split('T')[0];
      const filename = `certificado_${nombreLimpio}_${apellidoLimpio}_${fechaStr}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Accept-Ranges', 'bytes');

      logInfo('Certificado generado exitosamente', {
        dni: certificadoData.dni,
        filename,
        bufferSize: pdfBuffer.length
      });

      res.send(pdfBuffer);

    } catch (error) {
      logError('Error al generar certificado', error as Error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new InternalServerError('Error al generar el certificado PDF');
    }
  }

  // Vista previa de datos (sin generar PDF)
  async previewCertificado(req: Request, res: Response): Promise<void> {
    try {
      logInfo('Generando vista previa de certificado', { ip: req.ip });

      // Sanitizar datos de entrada
      const sanitizedData = CertificadoValidator.sanitizeData(req.body);
      
      // Validar datos
      const validation = CertificadoValidator.validateCertificadoData(sanitizedData);
      
      if (!validation.isValid) {
        throw new ValidationError(validation.errors?.join(', ') || 'Datos inválidos');
      }

      const certificadoData = validation.data as CertificadoData;
      
      // Generar nombre de archivo con nombre y apellido del paciente
      const nombreLimpio = certificadoData.nombre.replace(/[^a-zA-Z0-9]/g, '');
      const apellidoLimpio = certificadoData.apellido.replace(/[^a-zA-Z0-9]/g, '');
      const fechaStr = new Date().toISOString().split('T')[0];
      const filename = `certificado_${nombreLimpio}_${apellidoLimpio}_${fechaStr}.pdf`;
      
      // Agregar información adicional para la vista previa
      const preview = {
        ...certificadoData,
        fechaEmision: certificadoData.fechaEmision || new Date(),
        filename,
        estimatedSize: '~150KB'
      };

      const response: ApiResponse<typeof preview> = {
        success: true,
        data: preview,
        message: 'Vista previa generada exitosamente'
      };

      logInfo('Vista previa generada exitosamente', { dni: certificadoData.dni });
      res.json(response);

    } catch (error) {
      logError('Error al generar vista previa', error as Error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new InternalServerError('Error al generar la vista previa');
    }
  }

  // Validar datos sin generar certificado
  async validateData(req: Request, res: Response): Promise<void> {
    try {
      logInfo('Validando datos de certificado', { ip: req.ip });

      // Sanitizar datos de entrada
      const sanitizedData = CertificadoValidator.sanitizeData(req.body);
      
      // Validar datos
      const validation = CertificadoValidator.validateCertificadoData(sanitizedData);
      
      const response: ApiResponse<{ isValid: boolean; errors?: string[] }> = {
        success: true,
        data: {
          isValid: validation.isValid,
          ...(validation.errors && { errors: validation.errors })
        },
        message: validation.isValid ? 'Datos válidos' : 'Datos inválidos'
      };

      logInfo('Validación completada', { 
        isValid: validation.isValid,
        errorCount: validation.errors?.length || 0
      });

      res.json(response);

    } catch (error) {
      logError('Error al validar datos', error as Error);
      throw new InternalServerError('Error al validar los datos');
    }
  }

  // Endpoint específico para n8n/Telegram - parsea texto simple
  async generateFromTelegram(req: Request, res: Response): Promise<void> {
    try {
      logInfo('Iniciando generación de certificado desde Telegram', { 
        ip: req.ip,
        body: req.body
      });

      const { mensaje } = req.body;
      
      if (!mensaje || typeof mensaje !== 'string') {
        throw new ValidationError('Se requiere el campo "mensaje" con el texto a procesar');
      }

      // Parsear el mensaje: "33824963,JARA,JORGE,24HS.,Sindrome,gripal,B349"
      const partes = mensaje.trim().split(',').map(p => p.trim()).filter(p => p !== '');
      
      if (partes.length < 7) {
        throw new ValidationError('Formato de mensaje incorrecto. Esperado: DNI,APELLIDO,NOMBRE,TIEMPO,PALABRA1,PALABRA2,CODIGO');
      }

      const dni = partes[0] || '';
      const apellido = partes[1] || '';
      const nombre = partes[2] || '';
      const tiempoTexto = partes[3] || '';
      const palabra1 = partes[4] || '';
      const palabra2 = partes[5] || '';
      const codigoDiagnostico = partes[6] || 'Z76.1';

      if (!dni || !apellido || !nombre) {
        throw new ValidationError('DNI, apellido y nombre son obligatorios');
      }

      // Extraer horas de reposo del texto de tiempo (ej: "24HS." -> 24)
      const matchHoras = tiempoTexto.match(/(\d+)/);
      const horasReposo = matchHoras?.[1] ? parseInt(matchHoras[1]) : 24;

      // Construir descripción completa del diagnóstico
      const descripcionCompleta = `${tiempoTexto} ${palabra1} ${palabra2} ${codigoDiagnostico}`.trim();

      // Crear objeto de datos del certificado
      const certificadoData: CertificadoData = {
        dni,
        nombre,
        apellido,
        horasReposo,
        codigoDiagnostico,
        textoEntrada: descripcionCompleta,
        fechaEmision: new Date()
      };

      logInfo('Datos parseados desde Telegram', certificadoData);

      // Generar PDF
      const pdfBuffer = await this.certificadoGenerator.generateCertificado(certificadoData);

      // Generar nombre de archivo
      const nombreLimpio = nombre.replace(/[^a-zA-Z0-9]/g, '');
      const apellidoLimpio = apellido.replace(/[^a-zA-Z0-9]/g, '');
      const fechaStr = new Date().toISOString().split('T')[0];
      const filename = `certificado_${nombreLimpio}_${apellidoLimpio}_${fechaStr}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      logInfo('Certificado generado exitosamente desde Telegram', {
        dni: certificadoData.dni,
        filename,
        bufferSize: pdfBuffer.length
      });

      res.send(pdfBuffer);

    } catch (error) {
      logError('Error al generar certificado desde Telegram', error as Error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new InternalServerError('Error al generar el certificado desde Telegram');
    }
  }

  // Endpoint de salud del servicio
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const response: ApiResponse<{ status: string; timestamp: string; uptime: number }> = {
        success: true,
        data: {
          status: 'OK',
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        },
        message: 'Servicio funcionando correctamente'
      };

      res.json(response);
    } catch (error) {
      logError('Error en health check', error as Error);
      throw new InternalServerError('Error en el health check');
    }
  }
}