import { Router } from 'express';
import { setCertificadoRoutes } from './certificadoRoutes';

export const setRoutes = (app: Router) => {
    setCertificadoRoutes(app);
};