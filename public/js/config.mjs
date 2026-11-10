

const URL_BACKEND_PRODUCCION = '';
const esLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_BASE_URL = esLocal ? 'http://localhost:3000' : URL_BACKEND_PRODUCCION;
