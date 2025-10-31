import Joi from 'joi';
import { CertificadoData, ValidationRules } from '../types/index.js';
import { logError, logWarn } from '../utils/logger.js';

// Reglas de validación personalizadas
const validationRules: ValidationRules = {
  dni: {
    minLength: 7,
    maxLength: 8,
    pattern: /^[0-9]{7,8}$/
  },
  nombre: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
  },
  apellido: {
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/
  }
};

// Schema de validación con Joi
const certificadoSchema = Joi.object({
  codigoDiagnostico: Joi.string()
    .required()
    .min(1)
    .max(10)
    .pattern(/^[A-Z][0-9]{2,3}(\.[0-9])?$/)
    .messages({
      'string.pattern.base': 'El código de diagnóstico debe seguir el formato CIE-10/ICD-10 (ej: A09, N300)',
      'string.empty': 'El código de diagnóstico es requerido',
      'string.max': 'El código de diagnóstico no puede exceder 10 caracteres'
    }),

  nombre: Joi.string()
    .required()
    .min(validationRules.nombre.minLength)
    .max(validationRules.nombre.maxLength)
    .pattern(validationRules.nombre.pattern)
    .messages({
      'string.pattern.base': 'El nombre solo puede contener letras y espacios',
      'string.empty': 'El nombre es requerido',
      'string.min': `El nombre debe tener al menos ${validationRules.nombre.minLength} caracteres`,
      'string.max': `El nombre no puede exceder ${validationRules.nombre.maxLength} caracteres`
    }),

  apellido: Joi.string()
    .required()
    .min(validationRules.apellido.minLength)
    .max(validationRules.apellido.maxLength)
    .pattern(validationRules.apellido.pattern)
    .messages({
      'string.pattern.base': 'El apellido solo puede contener letras y espacios',
      'string.empty': 'El apellido es requerido',
      'string.min': `El apellido debe tener al menos ${validationRules.apellido.minLength} caracteres`,
      'string.max': `El apellido no puede exceder ${validationRules.apellido.maxLength} caracteres`
    }),

  dni: Joi.string()
    .required()
    .pattern(validationRules.dni.pattern)
    .messages({
      'string.pattern.base': 'El DNI debe contener entre 7 y 8 dígitos numéricos',
      'string.empty': 'El DNI es requerido'
    }),

  horasReposo: Joi.number()
    .required()
    .integer()
    .min(1)
    .max(720) // máximo 30 días
    .messages({
      'number.base': 'Las horas de reposo deben ser un número',
      'number.integer': 'Las horas de reposo deben ser un número entero',
      'number.min': 'Las horas de reposo deben ser al menos 1',
      'number.max': 'Las horas de reposo no pueden exceder 720 (30 días)',
      'any.required': 'Las horas de reposo son requeridas'
    }),

  textoEntrada: Joi.string()
    .required()
    .min(10)
    .max(500)
    .messages({
      'string.empty': 'El texto de entrada es requerido',
      'string.min': 'El texto de entrada debe tener al menos 10 caracteres',
      'string.max': 'El texto de entrada no puede exceder 500 caracteres'
    }),

  fechaEmision: Joi.date()
    .optional()
    .max('now')
    .messages({
      'date.max': 'La fecha de emisión no puede ser futura'
    })
});

export class CertificadoValidator {
  
  static validateCertificadoData(data: unknown): { isValid: boolean; errors?: string[]; data?: CertificadoData } {
    try {
      const { error, value } = certificadoSchema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        const errors = error.details.map(detail => detail.message);
        logWarn('Validación fallida', { errors, data });
        return { isValid: false, errors };
      }

      // Validaciones adicionales específicas
      const additionalValidation = this.performAdditionalValidations(value as CertificadoData);
      if (!additionalValidation.isValid) {
        return additionalValidation;
      }

      return { isValid: true, data: value as CertificadoData };
    } catch (error) {
      logError('Error inesperado durante validación', error as Error);
      return { isValid: false, errors: ['Error interno de validación'] };
    }
  }

  private static performAdditionalValidations(data: CertificadoData): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    // Validación específica del DNI
    if (!this.validateDNI(data.dni)) {
      errors.push('El DNI no cumple con el formato válido argentino');
    }

    // Validación del código diagnóstico más específica
    if (!this.validateDiagnosticCode(data.codigoDiagnostico)) {
      errors.push('El código de diagnóstico no es válido según estándares médicos');
    }

    // Validación de nombres (sin números ni caracteres especiales)
    if (!this.validateName(data.nombre) || !this.validateName(data.apellido)) {
      errors.push('Los nombres y apellidos no pueden contener números ni caracteres especiales');
    }

    // Validación lógica de horas de reposo
    if (!this.validateReposoHours(data.horasReposo)) {
      errors.push('Las horas de reposo deben ser múltiplos de 24 para períodos largos');
    }

    return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
  }

  static validateDNI(dni: string): boolean {
    // Validación básica de longitud y formato
    if (!validationRules.dni.pattern.test(dni)) {
      return false;
    }

    // Validación adicional: no puede ser todo ceros o números secuenciales
    if (dni === '00000000' || dni === '0000000') {
      return false;
    }

    // Verificar que no sea una secuencia simple (11111111, 12345678, etc.)
    const isSequential = /^(\d)\1{6,7}$/.test(dni) || /^1234567[8]?$/.test(dni);
    if (isSequential) {
      return false;
    }

    return true;
  }

  private static validateDiagnosticCode(code: string): boolean {
    // Códigos ICD-10 básicos para certificados médicos comunes
    const commonMedicalCodes = /^[A-Z][0-9]{2}(\.[0-9])?$/;
    return commonMedicalCodes.test(code);
  }

  private static validateName(name: string): boolean {
    // No debe contener números ni caracteres especiales excepto espacios y acentos
    const namePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
    return namePattern.test(name) && name.trim().length > 0;
  }

  private static validateReposoHours(hours: number): boolean {
    // Para períodos de más de 3 días, deben ser múltiplos de 24
    if (hours > 72 && hours % 24 !== 0) {
      return false;
    }
    return true;
  }

  // Sanitización de datos
  static sanitizeData(data: Partial<CertificadoData>): Partial<CertificadoData> {
    const sanitized: Partial<CertificadoData> = {};

    if (data.nombre) {
      sanitized.nombre = this.sanitizeString(data.nombre);
    }
    
    if (data.apellido) {
      sanitized.apellido = this.sanitizeString(data.apellido);
    }
    
    if (data.dni) {
      sanitized.dni = data.dni.replace(/\D/g, ''); // Solo números
    }
    
    if (data.codigoDiagnostico) {
      sanitized.codigoDiagnostico = data.codigoDiagnostico.toUpperCase().trim();
    }
    
    if (data.textoEntrada) {
      sanitized.textoEntrada = this.sanitizeString(data.textoEntrada);
    }
    
    if (data.horasReposo) {
      sanitized.horasReposo = Math.floor(Math.abs(data.horasReposo));
    }

    return sanitized;
  }

  private static sanitizeString(str: string): string {
    return str
      .trim()
      .replace(/\s+/g, ' ') // Múltiples espacios a uno solo
      .replace(/[<>"'&]/g, ''); // Remover caracteres potencialmente peligrosos
  }
}