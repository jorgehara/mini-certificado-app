// Interfaces para los datos del certificado
export interface CertificadoData {
  codigoDiagnostico: string;
  nombre: string;
  apellido: string;
  dni: string;
  horasReposo: number;
  textoEntrada: string;
  fechaEmision?: Date;
}

// Configuración de diseño del certificado
export interface CertificadoConfig {
  width: number;
  height: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  colors: {
    primary: string;
    secondary: string;
    text: string;
    accent: string;
  };
  fonts: {
    title: string;
    body: string;
    signature: string;
    caveat?: string;
    caveatMedium?: string;
  };
}

// Respuesta de la API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Configuración de validación
export interface ValidationRules {
  dni: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  nombre: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
  apellido: {
    minLength: number;
    maxLength: number;
    pattern: RegExp;
  };
}