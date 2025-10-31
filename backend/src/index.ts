import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { logInfo, logError } from './utils/logger.js';
import { errorHandler, notFoundHandler, rateLimitMiddleware } from './middleware/errorHandler.js';
import certificadosRoutes from './routes/certificados.js';

// Configuración del servidor
const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: false, // Deshabilitado para desarrollo
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
app.use(rateLimitMiddleware(100, 15 * 60 * 1000)); // 100 requests per 15 minutes

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
import { requestLogger } from './middleware/requestLogger.js';
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/certificados', certificadosRoutes);

// Backward compatibility - mantener ruta original del frontend
app.use('/api/certificados', certificadosRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (debe ser el último)
app.use(errorHandler);

// Manejo de señales del sistema
process.on('SIGTERM', () => {
  logInfo('SIGTERM recibido, cerrando servidor gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logInfo('SIGINT recibido, cerrando servidor gracefully...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('uncaughtException', (error: Error) => {
  logError('Excepción no capturada', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logError('Promise rejection no manejada', { reason, promise });
  process.exit(1);
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  logInfo(`🚀 Servidor iniciado en puerto ${PORT}`, { 
    environment: NODE_ENV,
    port: PORT
  });
  
  if (NODE_ENV === 'development') {
    console.log(`
    📋 Certificado App Backend
    🌐 URL: http://localhost:${PORT}
    🏥 Health: http://localhost:${PORT}/health
    📄 API: http://localhost:${PORT}/api/certificados
    
    Endpoints disponibles:
    POST /api/certificados/generate  - Generar certificado PDF
    POST /api/certificados/preview   - Vista previa de certificado
    POST /api/certificados/validate  - Validar datos
    GET  /api/certificados/health    - Estado del servicio
    `);
  }
});

// Configurar timeout del servidor
server.timeout = 30000; // 30 segundos

export default app;