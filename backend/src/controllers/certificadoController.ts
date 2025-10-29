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
        userAgent: req.get('User-Agent')
      });

      // Sanitizar datos de entrada
      const sanitizedData = CertificadoValidator.sanitizeData(req.body);
      
      // Validar datos
      const validation = CertificadoValidator.validateCertificadoData(sanitizedData);
      
      if (!validation.isValid) {
        throw new ValidationError(validation.errors?.join(', ') || 'Datos inválidos');
      }

      const certificadoData = validation.data as CertificadoData;
      
      // Agregar fecha de emisión si no está presente
      if (!certificadoData.fechaEmision) {
        certificadoData.fechaEmision = new Date();
      }

      // Generar PDF
      const pdfBuffer = await this.certificadoGenerator.generateCertificado(certificadoData);

      // Configurar headers para descarga
      const filename = `certificado_${certificadoData.dni}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

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
      
      // Agregar información adicional para la vista previa
      const preview = {
        ...certificadoData,
        fechaEmision: certificadoData.fechaEmision || new Date(),
        filename: `certificado_${certificadoData.dni}_${new Date().toISOString().split('T')[0]}.pdf`,
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