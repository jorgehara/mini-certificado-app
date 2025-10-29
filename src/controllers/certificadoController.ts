class CertificadoController {
    public generarCertificado(req: Request, res: Response): void {
        const { nombre, fechaNacimiento, diagnostico } = req.body;

        // Lógica para generar el certificado médico
        const certificado = {
            nombre,
            fechaNacimiento,
            diagnostico,
            fechaEmision: new Date().toISOString(),
        };

        res.status(200).json({
            mensaje: "Certificado médico generado con éxito",
            certificado,
        });
    }
}

export default CertificadoController;