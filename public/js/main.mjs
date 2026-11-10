

import { renderMarkdown } from './render.mjs';
import * as api from './api.mjs';
import {
  cargarPrefs, guardarPrefs, guardarBorrador, cargarBorrador, borrarPrefsYBorrador,
} from './prefs.mjs';
import { mostrarMensaje, setCargando, renderListaDocumentos, aplicarTema } from './ui.mjs';
import { exportarPDF } from './pdf.mjs';

const $ = (id) => document.getElementById(id);
const editor = $('editor');
const preview = $('preview');
const titulo = $('titulo');
const estado = $('estado');
const formulario = $('formDoc');
const listaDocs = $('listaDocs');
const docsEstado = $('docsEstado');
const archivo = $('archivo');

const TEXTO_INICIAL = `# Bienvenido al editor

Escribe **Markdown** en el panel de la izquierda y mira la vista previa aquí.

- Guarda tus documentos en el servidor con el botón *Guardar*
- Exporta el resultado a PDF
- Inserta una cita con el botón *Insertar cita*

> Prueba cambiar el tema claro/oscuro y abrir tus documentos guardados.
`;

let prefs = cargarPrefs();
let docActualId = null; // null = documento nuevo (aún no guardado en el servidor)
let idPendienteBorrar = null;

// ---------- Vista previa y borrador (sessionStorage) ----------
function actualizarVista() {
  preview.innerHTML = renderMarkdown(editor.value); // HTML ya sanitizado por DOMPurify
}

function persistirBorrador() {
  guardarBorrador({ titulo: titulo.value, contenido: editor.value, docId: docActualId });
}

let temporizador = null;
function alEscribir() {
  actualizarVista();
  estado.textContent = 'Editando…';
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    persistirBorrador();
    estado.textContent = 'Borrador guardado en esta pestaña (usa «Guardar» para conservarlo en el servidor).';
  }, 500);
}

editor.addEventListener('input', alEscribir);
titulo.addEventListener('input', () => {
  titulo.classList.remove('is-invalid');
  titulo.removeAttribute('aria-invalid');
  alEscribir();
});

// ---------- Tema y preferencias (localStorage) ----------
function mostrarSaludo() {
  $('saludo').textContent = prefs.nombre ? `Hola, ${prefs.nombre}` : '';
}

function temaInicial() {
  if (prefs.tema === 'light' || prefs.tema === 'dark') return prefs.tema;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function alternarTema() {
  const nuevo = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
  aplicarTema(nuevo);
  prefs = { ...prefs, tema: nuevo };
  guardarPrefs(prefs);
}

function guardarPreferencias() {
  prefs = { ...prefs, nombre: $('prefNombre').value.trim().slice(0, 40) };
  guardarPrefs(prefs);
  mostrarSaludo();
  bootstrap.Modal.getInstance($('modalPrefs'))?.hide();
  mostrarMensaje('success', 'Preferencias guardadas en este navegador.');
}

function borrarDatosLocales() {
  borrarPrefsYBorrador();
  prefs = cargarPrefs();
  aplicarTema(temaInicial());
  mostrarSaludo();
  $('prefNombre').value = '';
  bootstrap.Modal.getInstance($('modalPrefs'))?.hide();
  mostrarMensaje('info', 'Se borraron tus preferencias y el borrador de esta pestaña. Tus documentos guardados en el servidor siguen disponibles.');
}

// ---------- Documentos en el servidor (fetch + async/await) ----------
async function guardarDocumento() {
  const datos = { titulo: titulo.value.trim(), contenido: editor.value };
  if (datos.titulo === '') {
    titulo.classList.add('is-invalid');
    titulo.setAttribute('aria-invalid', 'true');
    mostrarMensaje('warning', 'Escribe un título antes de guardar.');
    titulo.focus();
    return;
  }

  const boton = $('btnGuardar');
  setCargando(boton, true, 'Guardando…');
  try {
    const doc = docActualId
      ? await api.actualizarDocumento(docActualId, datos)
      : await api.crearDocumento(datos);
    docActualId = doc.id;
    persistirBorrador();
    mostrarMensaje('success', `El documento «${doc.titulo}» se guardó en el servidor.`);
  } catch (error) {
    if (error.estado === 404) docActualId = null; // ya no existe: la próxima vez se crea de nuevo
    mostrarMensaje('danger', error.message);
  } finally {
    setCargando(boton, false);
  }
}

async function refrescarLista() {
  docsEstado.textContent = 'Cargando documentos…';
  listaDocs.replaceChildren();
  try {
    const documentos = await api.listarDocumentos();
    docsEstado.textContent = documentos.length === 0 ? 'Todavía no tienes documentos guardados.' : '';
    renderListaDocumentos(listaDocs, documentos);
  } catch (error) {
    docsEstado.textContent = '';
    mostrarMensaje('danger', error.message);
  }
}

async function abrirDocumento(id) {
  try {
    const doc = await api.obtenerDocumento(id);
    docActualId = doc.id;
    titulo.value = doc.titulo;
    editor.value = doc.contenido;
    actualizarVista();
    persistirBorrador();
    bootstrap.Offcanvas.getInstance($('panelDocs'))?.hide();
    mostrarMensaje('info', `Abriste «${doc.titulo}».`);
    editor.focus();
  } catch (error) {
    mostrarMensaje('danger', error.message);
  }
}

function pedirConfirmacionBorrado(id, tituloDoc) {
  idPendienteBorrar = id;
  $('borrarTitulo').textContent = tituloDoc;
  bootstrap.Modal.getOrCreateInstance($('modalBorrar')).show();
}

async function confirmarBorrado() {
  const id = idPendienteBorrar;
  idPendienteBorrar = null;
  bootstrap.Modal.getInstance($('modalBorrar'))?.hide();
  try {
    await api.borrarDocumento(id);
    if (id === docActualId) docActualId = null;
    mostrarMensaje('success', 'El documento se eliminó correctamente.');
    await refrescarLista();
  } catch (error) {
    mostrarMensaje('danger', error.message);
  }
}

function nuevoDocumento() {
  docActualId = null;
  titulo.value = '';
  editor.value = '';
  actualizarVista();
  persistirBorrador();
  titulo.focus();
  mostrarMensaje('info', 'Documento nuevo en blanco.');
}

// ---------- Cita aleatoria (backend -> API externa) ----------
async function insertarCita(boton) {
  setCargando(boton, true, 'Buscando cita…');
  try {
    const { texto, autor } = await api.obtenerCita();
    const bloque = `\n\n> ${texto}\n> — ${autor}\n`;
    editor.setRangeText(bloque, editor.selectionStart, editor.selectionEnd, 'end');
    alEscribir();
    mostrarMensaje('success', 'Se agregó una cita al documento.');
  } catch (error) {
    mostrarMensaje('danger', error.message);
  } finally {
    setCargando(boton, false);
  }
}

// ---------- PDF y archivos locales ----------
function nombreSeguro(texto) {
  const limpio = texto.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return limpio || 'documento';
}

async function exportar(boton) {
  setCargando(boton, true, 'Generando PDF…');
  try {
    const tituloDoc = titulo.value.trim() || 'Documento';
    await exportarPDF(preview, {
      nombreArchivo: `${nombreSeguro(tituloDoc)}.pdf`,
      titulo: tituloDoc,
      autor: prefs.nombre,
    });
    mostrarMensaje('success', 'El PDF se generó y se descargó.');
  } catch (error) {
    mostrarMensaje('danger', error.message || 'No se pudo generar el PDF.');
  } finally {
    setCargando(boton, false);
  }
}

function descargarMarkdown() {
  const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = `${nombreSeguro(titulo.value || 'documento')}.md`;
  enlace.click();
  URL.revokeObjectURL(url);
}

archivo.addEventListener('change', (evento) => {
  const elegido = evento.target.files[0];
  if (!elegido) return;
  const lector = new FileReader();
  lector.onload = () => {
    editor.value = String(lector.result);
    if (titulo.value.trim() === '') titulo.value = elegido.name.replace(/\.(md|markdown|txt)$/i, '');
    docActualId = null; // es contenido nuevo: no sobrescribe un documento del servidor
    alEscribir();
    mostrarMensaje('success', `Se abrió el archivo «${elegido.name}».`);
  };
  lector.onerror = () => mostrarMensaje('danger', 'No se pudo leer el archivo seleccionado.');
  lector.readAsText(elegido);
  archivo.value = '';
});

// ---------- Delegación de eventos ----------
// UN solo listener en <body> atiende todos los botones: cada uno declara
// su acción en data-action. Funciona también con los elementos creados
// dinámicamente (la lista de documentos) sin registrar listeners nuevos.
const acciones = {
  'tema': () => alternarTema(),
  'nuevo': () => nuevoDocumento(),
  'abrir-md': () => archivo.click(),
  'descargar-md': () => descargarMarkdown(),
  'cita': (boton) => insertarCita(boton),
  'exportar-pdf': (boton) => exportar(boton),
  'abrir-doc': (boton) => abrirDocumento(boton.dataset.id),
  'borrar-doc': (boton) => pedirConfirmacionBorrado(boton.dataset.id, boton.dataset.titulo),
  'confirmar-borrado': () => confirmarBorrado(),
  'guardar-prefs': () => guardarPreferencias(),
  'borrar-datos': () => borrarDatosLocales(),
};

document.body.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-action]');
  if (boton) acciones[boton.dataset.action]?.(boton);
});

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault(); // evita que la página se recargue
  guardarDocumento();
});

$('panelDocs').addEventListener('show.bs.offcanvas', refrescarLista);
$('modalPrefs').addEventListener('show.bs.modal', () => { $('prefNombre').value = prefs.nombre; });

// ---------- Inicio ----------
function iniciar() {
  aplicarTema(temaInicial());
  mostrarSaludo();
  const borrador = cargarBorrador(); // null en la primera visita de la pestaña
  if (borrador) {
    titulo.value = borrador.titulo ?? '';
    editor.value = borrador.contenido ?? '';
    docActualId = borrador.docId ?? null;
  } else {
    editor.value = TEXTO_INICIAL;
  }
  actualizarVista();
}

iniciar();
