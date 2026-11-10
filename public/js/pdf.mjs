

const RUTA_LIBRERIA = new URL('../libs/html2pdf.bundle.min.js', import.meta.url).href;
let promesaCarga = null;

function cargarLibreria() {
  if (window.html2pdf) return Promise.resolve();
  if (!promesaCarga) {
    promesaCarga = new Promise((resolver, rechazar) => {
      const script = document.createElement('script');
      script.src = RUTA_LIBRERIA;
      script.onload = resolver;
      script.onerror = () => {
        promesaCarga = null; // permite reintentar
        rechazar(new Error('No se pudo cargar el generador de PDF. Revisa tu conexión.'));
      };
      document.head.append(script);
    });
  }
  return promesaCarga;
}

/**
 * @param {HTMLElement} elemento  nodo ya renderizado que se convierte en PDF
 * @param {{nombreArchivo: string, titulo: string, autor: string}} meta
 */
export async function exportarPDF(elemento, { nombreArchivo, titulo, autor }) {
  await cargarLibreria();
  const opciones = {
    margin: 14,
    filename: nombreArchivo,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  };
  await window
    .html2pdf()
    .set(opciones)
    .from(elemento)
    .toPdf()
    .get('pdf')
    .then((pdf) => pdf.setProperties({ title: titulo, author: autor || 'Editor Markdown' }))
    .save();
}
