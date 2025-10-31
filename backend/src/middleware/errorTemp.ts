      // Respuesta de error
      const response: ApiResponse = {
        success: false,
        error: message,
        message: statusCode >= 500 ? 'Error interno del servidor' : message,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          code: (error as any).code,
          type: error.name,
          path: req.path
        } : undefined
      };

      // Asegurarse de que la respuesta sea JSON
      res.setHeader('Content-Type', 'application/json');
      res.status(statusCode).json(response);