import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Container,
} from '@mui/material';
import axios from 'axios';

interface FormInputs {
  textoEntrada: string;
  horasReposo: string;
}

interface ParsedData {
  codigoDiagnostico: string;
  nombre: string;
  apellido: string;
  dni: string;
}

export const CertificadoForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewData, setPreviewData] = useState<ParsedData | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<FormInputs>({
    defaultValues: {
      textoEntrada: '',
      horasReposo: ''
    }
  });

  const parseTextoEntrada = (texto: string): ParsedData | null => {
    try {
      const partes = texto.trim().split(/\s+/);
      const codigoDiagnostico = partes[0];
      const posicionTitular = partes.findIndex(p => p.toLowerCase() === 'titular');
      
      if (posicionTitular === -1) {
        throw new Error('No se encontró la palabra "Titular" en el texto');
      }

      const dni = partes[posicionTitular + 1];
      const nombreCompleto = partes.slice(2, posicionTitular).join(' ');
      const ultimoEspacio = nombreCompleto.lastIndexOf(' ');
      const apellido = nombreCompleto.substring(0, ultimoEspacio);
      const nombre = nombreCompleto.substring(ultimoEspacio + 1);

      return {
        codigoDiagnostico,
        nombre,
        apellido,
        dni
      };
    } catch (error) {
      console.error('Error al parsear texto:', error);
      return null;
    }
  };

  const onSubmit = async (data: FormInputs) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const parsedData = parseTextoEntrada(data.textoEntrada);
      if (!parsedData) {
        throw new Error('Error al procesar el texto de entrada');
      }
      setPreviewData(parsedData);

      const response = await axios.post('/api/certificados', {
        ...data,
        horasReposo: parseInt(data.horasReposo),
        ...parsedData
      }, {
        responseType: 'blob'
      });

      // Crear y descargar el PDF
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificado_${parsedData.dni}_${new Date().toISOString()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el certificado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Generador de Certificados Médicos
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Controller
              name="textoEntrada"
              control={control}
              rules={{ required: 'Este campo es requerido' }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Texto de Entrada"
                  multiline
                  rows={3}
                  error={!!errors.textoEntrada}
                  helperText={errors.textoEntrada?.message || 'Ejemplo: N300 34040769 MUÑOZ OMAR ARIEL Titular 34040769'}
                  placeholder="Ingrese el texto completo aquí"
                />
              )}
            />

            <Controller
              name="horasReposo"
              control={control}
              rules={{ required: 'Debe seleccionar las horas de reposo' }}
              render={({ field }) => (
                <FormControl error={!!errors.horasReposo}>
                  <InputLabel>Horas de Reposo</InputLabel>
                  <Select
                    {...field}
                    label="Horas de Reposo"
                  >
                    <MenuItem value="">Seleccione</MenuItem>
                    <MenuItem value="24">24 horas</MenuItem>
                    <MenuItem value="48">48 horas</MenuItem>
                  </Select>
                  {errors.horasReposo && (
                    <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                      {errors.horasReposo.message}
                    </Typography>
                  )}
                </FormControl>
              )}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              size="large"
              sx={{ mt: 2 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} />
                  Generando...
                </>
              ) : 'Generar Certificado'}
            </Button>
          </Box>
        </form>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Certificado generado exitosamente
          </Alert>
        )}

        {previewData && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Vista Previa de Datos
            </Typography>
            <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography><strong>Código Diagnóstico:</strong> {previewData.codigoDiagnostico}</Typography>
              <Typography><strong>Nombre:</strong> {previewData.nombre}</Typography>
              <Typography><strong>Apellido:</strong> {previewData.apellido}</Typography>
              <Typography><strong>DNI:</strong> {previewData.dni}</Typography>
            </Paper>
          </Box>
        )}
      </Paper>
    </Container>
  );
};