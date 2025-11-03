import { Router } from 'express';
import { CertificadoController } from '../controllers/certificadoController.js';
import { asyncHandler, validateContentType, validatePayloadSize } from '../middleware/errorHandler.js';

const router = Router();
const certificadoController = new CertificadoController();

// Middleware para rutas de certificados
router.use(validateContentType);
router.use(validatePayloadSize(5 * 1024 * 1024)); // 5MB máximo

// Rutas principales
router.post('/generate', 
  asyncHandler(certificadoController.generateCertificado.bind(certificadoController))
);

router.post('/telegram', 
  asyncHandler(certificadoController.generateFromTelegram.bind(certificadoController))
);

router.post('/preview', 
  asyncHandler(certificadoController.previewCertificado.bind(certificadoController))
);

router.post('/validate', 
  asyncHandler(certificadoController.validateData.bind(certificadoController))
);

router.get('/health', 
  asyncHandler(certificadoController.healthCheck.bind(certificadoController))
);

export default router;