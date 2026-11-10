// ============================================================
// routes/quotes.mjs — cita aleatoria
//
//   GET /api/quotes/random -> 200 { texto, autor } | 502
//
// El navegador NO llama directamente a la API externa: le pide la
// cita a NUESTRO servidor, y el servidor consulta DummyJSON.
// Ventajas: la URL externa queda en una variable de entorno,
// se controla el formato de respuesta y se evita CORS con terceros.
// ============================================================

import { Router } from 'express';

export function crearRouterCitas({ urlApi, tiempoMaximoMs = 5000 }) {
  const router = Router();

  router.get('/random', async (req, res) => {
    try {
      const respuesta = await fetch(urlApi, { signal: AbortSignal.timeout(tiempoMaximoMs) });
      if (!respuesta.ok) throw new Error(`La API externa respondió ${respuesta.status}`);

      const datos = await respuesta.json();
      if (typeof datos?.quote !== 'string' || typeof datos?.author !== 'string') {
        throw new Error('La API externa devolvió un formato inesperado');
      }
      res.status(200).json({ texto: datos.quote, autor: datos.author });
    } catch (error) {
      console.error('Error consultando la API de citas:', error.message);
      // 502 Bad Gateway: nuestro servidor está bien, falló el servicio externo
      res.status(502).json({ error: 'No se pudo obtener una cita del servicio externo. Inténtalo más tarde.' });
    }
  });

  return router;
}
