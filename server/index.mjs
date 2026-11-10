

import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.mjs';
import { crearAlmacen } from './store.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const enProduccion = process.env.NODE_ENV === 'production';

const PUERTO = Number(process.env.PORT) || 3000;

// En desarrollo se aceptan los orígenes locales; en producción solo los
// que se indiquen explícitamente (el mismo origen siempre está permitido).
const origenesLocales = 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:5500,http://127.0.0.1:5500';
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? (enProduccion ? '' : origenesLocales))
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

const app = createApp({
  almacen: crearAlmacen(process.env.DATA_FILE ?? path.join(raiz, 'data', 'documents.json')),
  publicDir: path.join(raiz, 'public'),
  allowedOrigins,
  quotesApiUrl: process.env.QUOTES_API_URL ?? 'https://dummyjson.com/quotes/random',
});

app.listen(PUERTO, () => {
  console.log(`Servidor listo en http://localhost:${PUERTO}`);
  console.log(`Orígenes CORS permitidos: ${allowedOrigins.join(', ') || '(solo el mismo origen)'}`);
});
