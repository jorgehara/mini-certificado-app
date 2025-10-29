export interface CertificadoRequest {
    nombre: string;
    apellido: string;
    fechaNacimiento: string;
    fechaEmision: string;
    motivo: string;
}

export interface CertificadoResponse {
    id: string;
    nombre: string;
    apellido: string;
    fechaNacimiento: string;
    fechaEmision: string;
    motivo: string;
    estado: string;
}