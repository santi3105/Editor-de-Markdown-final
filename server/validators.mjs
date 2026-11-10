

export const MAX_TITULO = 100;
export const MAX_CONTENIDO = 200_000; // caracteres
export const MAX_DOCUMENTOS_POR_CLIENTE = 50;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function esUuid(valor) {
  return typeof valor === 'string' && UUID.test(valor);
}

/**
 * Valida el cuerpo de un POST/PUT de documentos.
 * @returns {{ valido: boolean, errores: string[], datos?: {titulo: string, contenido: string} }}
 */
export function validarDocumento(cuerpo) {
  const errores = [];

  if (typeof cuerpo?.titulo !== 'string' || cuerpo.titulo.trim() === '') {
    errores.push('El título es obligatorio.');
  } else if (cuerpo.titulo.trim().length > MAX_TITULO) {
    errores.push(`El título no puede superar los ${MAX_TITULO} caracteres.`);
  }

  if (typeof cuerpo?.contenido !== 'string') {
    errores.push('El contenido debe ser un texto.');
  } else if (cuerpo.contenido.length > MAX_CONTENIDO) {
    errores.push(`El contenido no puede superar los ${MAX_CONTENIDO} caracteres.`);
  }

  if (errores.length > 0) return { valido: false, errores };
  return {
    valido: true,
    errores,
    datos: { titulo: cuerpo.titulo.trim(), contenido: cuerpo.contenido },
  };
}
