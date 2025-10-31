import { Request, Response, NextFunction } from 'express';
import { logInfo } from '../utils/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  // Capturar el inicio de la petición
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  // Logging inicial
  console.log(`[${requestId}] Nueva petición iniciada:`, {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Interceptar la finalización de la petición
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    const logData = {
      requestId,
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length'),
      contentType: res.get('content-type')
    };

    if (res.statusCode >= 400) {
      console.error(`[${requestId}] Petición fallida:`, logData);
    } else {
      console.log(`[${requestId}] Petición completada:`, logData);
    }

    // Registrar en el sistema de logs
    logInfo('Petición HTTP completada', logData);
  });

  next();
};