# Carpeta de Assets

## Imágenes para el Certificado

Coloca aquí las imágenes que necesites para el certificado:

- `firma-doctora.png` - Imagen de la firma digitalizada de la doctora
- `sello-medico.png` - Sello médico (si es diferente a la firma)
- `logo-consultorio.png` - Logo del consultorio (opcional)

## Formatos soportados

PDFKit soporta los siguientes formatos de imagen:
- PNG
- JPEG/JPG
- PDF (como imagen)

## Uso en el código

Para usar una imagen en el generador de certificados:

```typescript
// Desde archivo local
doc.image('./assets/firma-doctora.png', x, y, { width: 80, height: 40 });

// Desde Base64
const firmaBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
doc.image(firmaBase64, x, y, { width: 80, height: 40 });
```