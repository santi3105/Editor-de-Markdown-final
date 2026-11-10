// ============================================================
// config.mjs — ÚNICO lugar donde se define la URL del backend.
// El resto del código importa API_BASE_URL y nunca escribe una
// dirección a mano, así pasar de local a producción es cambiar
// una sola línea.
//
//  - En tu computador (localhost / 127.0.0.1) el backend corre en el puerto 3000.
//  - En producción el MISMO servidor Express entrega el frontend, así que se usa
//    una ruta relativa (cadena vacía = mismo origen, sin CORS).
//  - Si algún día el frontend se publica aparte (Netlify/Vercel), basta con
//    poner aquí la URL del backend en Render.
// ============================================================

const URL_BACKEND_PRODUCCION = '';
const esLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE_URL = esLocal ? 'http://localhost:3000' : URL_BACKEND_PRODUCCION;
