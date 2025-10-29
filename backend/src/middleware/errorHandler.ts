import { Request, Response, NextFunction } from 'express';
import { logError } from '../utils/logger.js';
import { ApiResponse } from '../types/index.js';

// Clase personalizada para errores de la aplicación
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    // Mantener el stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Errores específicos de la aplicación
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, 404);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Error interno del servidor') {
    super(message, 500);
  }
}

// Middleware para manejo de rutas no encontradas
export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ApiResponse = {
    success: false,
    error: `Ruta no encontrada: ${req.method} ${req.path}`,
    message: 'El endpoint solicitado no existe'
  };
  
  logError(`Ruta no encontrada: ${req.method} ${req.path}`, { 
    ip: req.ip, 
    userAgent: req.get('User-Agent') 
  });
  
  res.status(404).json(response);
};

// Middleware principal de manejo de errores
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = 'Error interno del servidor';
  let isOperational = false;

  // Determinar tipo de error y respuesta apropiada
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = error.message;
    isOperational = true;
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Formato de datos inválido';
    isOperational = true;
  } else if (error.name === 'MongoError' && 'code' in error && (error as Record<string, unknown>).code === 11000) {
    statusCode = 409;
    message = 'Recurso duplicado';
    isOperational = true;
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
    isOperational = true;
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
    isOperational = true;
  }

  // Loguear el error
  logError(`Error ${statusCode}: ${message}`, {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    isOperational
  });

  // Respuesta de error
  const response: ApiResponse = {
    success: false,
    error: message,
    message: statusCode >= 500 ? 'Error interno del servidor' : message
  };

  // En desarrollo, incluir stack trace para errores del servidor
  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    (response as unknown as Record<string, unknown>).stack = error.stack;
  }

  res.status(statusCode).json(response);
};

// Middleware para capturar errores asíncronos
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Middleware de validación de Content-Type
export const validateContentType = (req: Request, res: Response, next: NextFunction): void => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      const error = new ValidationError('Content-Type debe ser application/json');
      next(error);
      return;
    }
  }
  next();
};

// Middleware de validación de tamaño de payload
export const validatePayloadSize = (maxSize: number = 10 * 1024 * 1024) => { // 10MB por defecto
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentLength = req.get('Content-Length');
    if (contentLength && parseInt(contentLength) > maxSize) {
      const error = new ValidationError(`El payload excede el tamaño máximo permitido (${maxSize} bytes)`);
      next(error);
      return;
    }
    next();
  };
};

// Middleware de rate limiting básico
export const rateLimitMiddleware = (
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutos
) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;

    // Limpiar entradas antiguas
    for (const [key, value] of requests.entries()) {
      if (value.resetTime < windowStart) {
        requests.delete(key);
      }
    }

    // Verificar límite para este cliente
    const clientData = requests.get(clientId) || { count: 0, resetTime: now + windowMs };
    
    if (clientData.count >= maxRequests && clientData.resetTime > now) {
      const response: ApiResponse = {
        success: false,
        error: 'Demasiadas solicitudes',
        message: `Límite de ${maxRequests} solicitudes por ${windowMs / 1000 / 60} minutos excedido`
      };
      
      res.status(429).json(response);
      return;
    }

    // Incrementar contador
    clientData.count++;
    requests.set(clientId, clientData);
    
    next();
  };
};