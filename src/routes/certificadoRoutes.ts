import { Router } from 'express';
import { CertificadoController } from '../controllers/certificadoController';

const router = Router();
const certificadoController = new CertificadoController();

export const setCertificadoRoutes = (app: Router) => {
    app.post('/certificado', certificadoController.generarCertificado.bind(certificadoController));
};