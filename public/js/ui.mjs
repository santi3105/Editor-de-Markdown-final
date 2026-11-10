

const contenedorMensajes = document.getElementById('mensajes');
const ETIQUETAS = { success: 'Éxito', danger: 'Error', info: 'Aviso', warning: 'Atención' };

/**
 * Muestra un mensaje claro (con texto, no solo color) arriba de la página.
 * Los errores usan role="alert" (se anuncian de inmediato en lectores de pantalla).
 */
export function mostrarMensaje(tipo, texto) {
  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipo} alert-dismissible fade show mb-0`;
  alerta.setAttribute('role', tipo === 'danger' ? 'alert' : 'status');

  const etiqueta = document.createElement('strong');
  etiqueta.textContent = `${ETIQUETAS[tipo]}: `;

  const cerrar = document.createElement('button');
  cerrar.type = 'button';
  cerrar.className = 'btn-close';
  cerrar.setAttribute('data-bs-dismiss', 'alert');
  cerrar.setAttribute('aria-label', 'Cerrar mensaje');

  alerta.append(etiqueta, document.createTextNode(texto), cerrar);
  contenedorMensajes.replaceChildren(alerta); // un solo mensaje a la vez

  if (tipo !== 'danger') {
    setTimeout(() => {
      if (alerta.isConnected) bootstrap.Alert.getOrCreateInstance(alerta).close();
    }, 6000);
  }
}

/** Estado de carga: deshabilita el botón, muestra un spinner y avisa con aria-busy. */
export function setCargando(boton, cargando, textoCargando = 'Cargando…') {
  if (cargando) {
    boton.dataset.textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.setAttribute('aria-busy', 'true');
    const spinner = document.createElement('span');
    spinner.className = 'spinner-border spinner-border-sm me-2';
    spinner.setAttribute('aria-hidden', 'true');
    boton.replaceChildren(spinner, document.createTextNode(textoCargando));
  } else {
    boton.disabled = false;
    boton.removeAttribute('aria-busy');
    boton.textContent = boton.dataset.textoOriginal ?? boton.textContent;
  }
}

/** Dibuja la lista de documentos guardados en el servidor. */
export function renderListaDocumentos(lista, documentos) {
  lista.replaceChildren();
  for (const doc of documentos) {
    const item = document.createElement('li');
    item.className = 'list-group-item d-flex justify-content-between align-items-center gap-2';

    const abrir = document.createElement('button');
    abrir.type = 'button';
    abrir.className = 'btn btn-link text-start p-0 flex-grow-1';
    abrir.dataset.action = 'abrir-doc';
    abrir.dataset.id = doc.id;
    abrir.textContent = doc.titulo;

    const fecha = document.createElement('small');
    fecha.className = 'd-block text-body-secondary';
    fecha.textContent = new Date(doc.actualizado).toLocaleString('es-CO');

    const bloque = document.createElement('div');
    bloque.className = 'flex-grow-1';
    bloque.append(abrir, fecha);

    const borrar = document.createElement('button');
    borrar.type = 'button';
    borrar.className = 'btn btn-danger btn-sm';
    borrar.dataset.action = 'borrar-doc';
    borrar.dataset.id = doc.id;
    borrar.dataset.titulo = doc.titulo;
    borrar.setAttribute('aria-label', `Eliminar el documento ${doc.titulo}`);
    borrar.textContent = 'Eliminar';

    item.append(bloque, borrar);
    lista.append(item);
  }
}

/** Cambia el tema de Bootstrap (data-bs-theme) y actualiza el botón. */
export function aplicarTema(tema) {
  document.documentElement.setAttribute('data-bs-theme', tema);
  const boton = document.getElementById('btnTema');
  boton.textContent = tema === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';
}
