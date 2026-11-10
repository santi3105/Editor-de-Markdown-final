// ============================================================
// app.mjs — construye la aplicación Express (sin arrancarla).
// Separarlo de index.mjs permite probar la API con tests.
// ============================================================

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { crearRouterDocumentos } from './routes/documents.mjs';
import { crearRouterCitas } from './routes/quotes.mjs';

function esMismoOrigen(origen, req) {
  try {
    return new URL(origen).host === req.headers.host;
  } catch {
    return false;
  }
}

export function createApp({ almacen, publicDir, allowedOrigins = [], quotesApiUrl, registrar = true }) {
  const app = express();
  app.disable('x-powered-by'); // no avisamos qué tecnología usa el servidor

  // Optimización: comprime (gzip) las respuestas de texto
  app.use(compression());

  // Registro sencillo de cada petición (útil para ver errores en los logs de Render)
  if (registrar) {
    app.use((req, res, next) => {
      const inicio = Date.now();
      res.on('finish', () => {
        console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - inicio} ms)`);
      });
      next();
    });
  }

  // CORS: solo se aceptan peticiones del mismo origen o de los orígenes
  // de la lista blanca (variable de entorno ALLOWED_ORIGINS).
  app.use(
    cors((req, callback) => {
      const origen = req.header('Origin');
      const permitido = !origen || allowedOrigins.includes(origen) || esMismoOrigen(origen, req);
      if (!permitido) {
        const error = new Error('Origen no permitido por CORS.');
        error.status = 403;
        return callback(error);
      }
      callback(null, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'X-Client-Id'],
        maxAge: 600,
      });
    }),
  );

  app.use(express.json({ limit: '1mb' }));

  // ---------- Rutas de la API ----------
  app.get('/api/health', (req, res) => {
    res.status(200).json({ estado: 'ok', tiempoActivoSegundos: Math.round(process.uptime()) });
  });
  app.use('/api/documents', crearRouterDocumentos(almacen));
  app.use('/api/quotes', crearRouterCitas({ urlApi: quotesApiUrl }));
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada.' });
  });

  // ---------- Archivos estáticos (el frontend) ----------
  // Las librerías no cambian: se pueden cachear 30 días en el navegador.
  app.use('/libs', express.static(`${publicDir}/libs`, { maxAge: '30d', immutable: true }));
  app.use(express.static(publicDir));

  // ---------- Manejo de errores (siempre JSON, sin filtrar detalles internos) ----------
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido.' });
    }
    if (error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'El contenido enviado es demasiado grande.' });
    }
    if (error.status === 403) {
      return res.status(403).json({ error: error.message });
    }
    console.error('Error no controlado:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  });

  return app;
}
