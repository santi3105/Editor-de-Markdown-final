// ============================================================
// api.mjs — toda la comunicación con el backend (fetch + async/await)
//
// Un solo helper ("pedir") hace la petición, revisa response.ok y
// convierte cualquier fallo en un ErrorApi con un mensaje claro para
// la persona que usa la aplicación.
// ============================================================

import { API_BASE_URL } from './config.mjs';
import { obtenerIdCliente } from './prefs.mjs';

export class ErrorApi extends Error {
  constructor(mensaje, estado) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado; // código HTTP (0 = no hubo respuesta)
  }
}

async function pedir(ruta, { metodo = 'GET', cuerpo } = {}) {
  const opciones = { method: metodo, headers: { 'X-Client-Id': obtenerIdCliente() } };
  if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE_URL}${ruta}`, opciones);
  } catch {
    // fetch solo lanza error cuando no hay red / el servidor no responde
    throw new ErrorApi('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0);
  }

  if (respuesta.status === 204) return null; // éxito sin cuerpo (DELETE)

  let datos = null;
  try {
    datos = await respuesta.json();
  } catch {
    /* la respuesta no traía JSON */
  }

  // fetch NO lanza error con un 400 o un 500: hay que revisar response.ok
  if (!respuesta.ok) {
    const detalles = Array.isArray(datos?.detalles) ? ` ${datos.detalles.join(' ')}` : '';
    const mensaje = datos?.error ?? `El servidor respondió con el código ${respuesta.status}.`;
    throw new ErrorApi(`${mensaje}${detalles}`, respuesta.status);
  }
  return datos;
}

export const listarDocumentos = () => pedir('/api/documents');
export const obtenerDocumento = (id) => pedir(`/api/documents/${encodeURIComponent(id)}`);
export const crearDocumento = (datos) => pedir('/api/documents', { metodo: 'POST', cuerpo: datos });
export const actualizarDocumento = (id, datos) =>
  pedir(`/api/documents/${encodeURIComponent(id)}`, { metodo: 'PUT', cuerpo: datos });
export const borrarDocumento = (id) => pedir(`/api/documents/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
export const obtenerCita = () => pedir('/api/quotes/random');
