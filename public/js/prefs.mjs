// ============================================================
// prefs.mjs — persistencia en el navegador (Web Storage)
//
//  localStorage   -> lo que debe recordarse SIEMPRE: preferencias
//                    (tema, nombre) y un identificador anónimo del navegador.
//  sessionStorage -> datos de ESTA visita: el borrador que se está escribiendo.
//                    Se pierde al cerrar la pestaña (lo que importa se guarda
//                    en el servidor con el botón "Guardar").
//
// No se guarda nada sensible: ni contraseñas ni datos personales
// más allá de un nombre opcional que el usuario escribe.
// ============================================================

const CLAVE_PREFS = 'md-editor:prefs';
const CLAVE_CLIENTE = 'md-editor:clientId';
const CLAVE_BORRADOR = 'md-editor:borrador';

// Lectura segura: si no hay nada (primera visita => null), si el JSON está
// dañado o si el navegador bloquea el almacenamiento, se devuelve el valor por defecto.
function leerJson(almacen, clave, porDefecto) {
  try {
    const texto = almacen.getItem(clave);
    if (texto === null) return porDefecto;
    return JSON.parse(texto);
  } catch {
    return porDefecto;
  }
}

function escribirJson(almacen, clave, valor) {
  try {
    almacen.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false; // almacenamiento lleno o bloqueado
  }
}

// ---------- Preferencias (localStorage) ----------
export function cargarPrefs() {
  return { tema: null, nombre: '', ...leerJson(localStorage, CLAVE_PREFS, {}) };
}

export function guardarPrefs(prefs) {
  return escribirJson(localStorage, CLAVE_PREFS, prefs);
}

// ---------- Identificador anónimo del navegador (localStorage) ----------
let idCliente = null;
export function obtenerIdCliente() {
  if (idCliente) return idCliente;
  try {
    idCliente = localStorage.getItem(CLAVE_CLIENTE);
  } catch {
    idCliente = null;
  }
  if (!idCliente) {
    idCliente = crypto.randomUUID();
    try {
      localStorage.setItem(CLAVE_CLIENTE, idCliente);
    } catch {
      /* sin almacenamiento: el id dura mientras la página esté abierta */
    }
  }
  return idCliente;
}

// ---------- Borrador de la visita (sessionStorage) ----------
export function guardarBorrador(borrador) {
  return escribirJson(sessionStorage, CLAVE_BORRADOR, borrador);
}

export function cargarBorrador() {
  return leerJson(sessionStorage, CLAVE_BORRADOR, null);
}

// ---------- Borrar datos ----------
// No se borra el identificador: sin él, los documentos guardados en el
// servidor quedarían inaccesibles para este navegador.
export function borrarPrefsYBorrador() {
  try {
    localStorage.removeItem(CLAVE_PREFS);
    sessionStorage.removeItem(CLAVE_BORRADOR);
  } catch {
    /* nada que borrar */
  }
}
