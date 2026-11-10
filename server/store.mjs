

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export function crearAlmacen(rutaArchivo) {
  let documentos = null; // caché en memoria
  let cola = Promise.resolve(); // las escrituras se hacen una tras otra

  async function cargar() {
    if (documentos !== null) return;
    try {
      const texto = await fs.readFile(rutaArchivo, 'utf8');
      const datos = JSON.parse(texto);
      documentos = Array.isArray(datos) ? datos : [];
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('No se pudo leer el archivo de datos:', error.message);
      }
      documentos = []; // primera ejecución: todavía no existe el archivo
    }
  }

  function persistir() {
    cola = cola
      .then(async () => {
        await fs.mkdir(path.dirname(rutaArchivo), { recursive: true });
        await fs.writeFile(rutaArchivo, JSON.stringify(documentos, null, 2), 'utf8');
      })
      .catch((error) => console.error('No se pudo guardar el archivo de datos:', error.message));
    return cola;
  }

  const resumen = ({ id, titulo, actualizado }) => ({ id, titulo, actualizado });

  return {
    async listar(propietario) {
      await cargar();
      return documentos
        .filter((d) => d.propietario === propietario)
        .sort((a, b) => b.actualizado.localeCompare(a.actualizado))
        .map(resumen);
    },

    async contar(propietario) {
      await cargar();
      return documentos.filter((d) => d.propietario === propietario).length;
    },

    async obtener(id, propietario) {
      await cargar();
      const doc = documentos.find((d) => d.id === id && d.propietario === propietario);
      return doc ? { ...doc, propietario: undefined } : null;
    },

    async crear(propietario, { titulo, contenido }) {
      await cargar();
      const ahora = new Date().toISOString();
      const doc = { id: randomUUID(), propietario, titulo, contenido, creado: ahora, actualizado: ahora };
      documentos.push(doc);
      await persistir();
      return { ...doc, propietario: undefined };
    },

    async actualizar(id, propietario, { titulo, contenido }) {
      await cargar();
      const doc = documentos.find((d) => d.id === id && d.propietario === propietario);
      if (!doc) return null;
      doc.titulo = titulo;
      doc.contenido = contenido;
      doc.actualizado = new Date().toISOString();
      await persistir();
      return { ...doc, propietario: undefined };
    },

    async borrar(id, propietario) {
      await cargar();
      const indice = documentos.findIndex((d) => d.id === id && d.propietario === propietario);
      if (indice === -1) return false;
      documentos.splice(indice, 1);
      await persistir();
      return true;
    },
  };
}
