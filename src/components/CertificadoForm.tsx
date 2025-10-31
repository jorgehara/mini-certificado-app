import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  Alert,
  CircularProgress,
  Container
} from '@mui/material';
import axios from 'axios';

interface FormInputs {
  nombre: string;
  apellido: string;
  dni: string;
  codigoDiagnostico: string;
  horasReposo: string;
  fechaConsulta: string;
  diagnosticoDescripcion: string;
}

export const CertificadoForm = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [previewData, setPreviewData] = useState<FormInputs | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<FormInputs>({
    defaultValues: {
      nombre: '',
      apellido: '',
      dni: '',
      codigoDiagnostico: '',
      horasReposo: '24',
      fechaConsulta: new Date().toISOString().split('T')[0],
      diagnosticoDescripcion: ''
    }
  });

  const onSubmit = async (data: FormInputs) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      setPreviewData(data);

      const certificadoData = {
        ...data,
        horasReposo: parseInt(data.horasReposo),
      };

      const response = await axios.post('http://localhost:3001/api/generar-certificado', certificadoData);
      
      if (response.data.url) {
        window.open(response.data.url, '_blank');
        setSuccess(true);
      }
    } catch (err) {
      console.error('Error durante el proceso:', err);
      setError(err instanceof Error ? err.message : 'Error al generar el certificado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h5" gutterBottom align="center">
          Generador de Certificados Médicos
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Controller
                name="nombre"
                control={control}
                rules={{ required: 'El nombre es requerido' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nombre"
                    error={!!errors.nombre}
                    helperText={errors.nombre?.message}
                    fullWidth
                  />
                )}
              />

              <Controller
                name="apellido"
                control={control}
                rules={{ required: 'El apellido es requerido' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Apellido"
                    error={!!errors.apellido}
                    helperText={errors.apellido?.message}
                    fullWidth
                  />
                )}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2 }}>
              <Controller
                name="dni"
                control={control}
                rules={{ 
                  required: 'El DNI es requerido',
                  pattern: {
                    value: /^[0-9]{7,8}$/,
                    message: 'DNI debe tener 7 u 8 dígitos'
                  }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="DNI"
                    error={!!errors.dni}
                    helperText={errors.dni?.message}
                    fullWidth
                  />
                )}
              />

              <Controller
                name="codigoDiagnostico"
                control={control}
                rules={{ required: 'El código de diagnóstico es requerido' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Código Diagnóstico"
                    error={!!errors.codigoDiagnostico}
                    helperText={errors.codigoDiagnostico?.message || 'Ej: A099'}
                    fullWidth
                  />
                )}
              />

              <Controller
                name="horasReposo"
                control={control}
                rules={{ required: 'Las horas de reposo son requeridas' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Horas de Reposo"
                    type="number"
                    error={!!errors.horasReposo}
                    helperText={errors.horasReposo?.message}
                    fullWidth
                    InputProps={{ inputProps: { min: 1, max: 168 } }}
                  />
                )}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Controller
                name="fechaConsulta"
                control={control}
                rules={{ required: 'La fecha de consulta es requerida' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Fecha de Consulta"
                    type="date"
                    error={!!errors.fechaConsulta}
                    helperText={errors.fechaConsulta?.message}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                )}
              />

              <Controller
                name="diagnosticoDescripcion"
                control={control}
                rules={{ required: 'La descripción del diagnóstico es requerida' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Descripción del Diagnóstico"
                    error={!!errors.diagnosticoDescripcion}
                    helperText={errors.diagnosticoDescripcion?.message}
                    multiline
                    rows={4}
                    fullWidth
                  />
                )}
              />
            </Box>

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
              <Paper elevation={1} sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Vista Previa:
                </Typography>
                <Typography>Nombre: {previewData.nombre}</Typography>
                <Typography>Apellido: {previewData.apellido}</Typography>
                <Typography>DNI: {previewData.dni}</Typography>
                <Typography>Código Diagnóstico: {previewData.codigoDiagnostico}</Typography>
                <Typography>Horas de Reposo: {previewData.horasReposo}</Typography>
                <Typography>Fecha de Consulta: {previewData.fechaConsulta}</Typography>
                <Typography>Descripción: {previewData.diagnosticoDescripcion}</Typography>
              </Paper>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                sx={{ minWidth: 200 }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  'Generar Certificado'
                )}
              </Button>
            </Box>
          </Box>
        </form>
      </Paper>
    </Container>
  );
};