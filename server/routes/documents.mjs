
import { Router } from 'express';
import { esUuid, validarDocumento, MAX_DOCUMENTOS_POR_CLIENTE } from '../validators.mjs';

function identificarCliente(req, res, next) {
  const id = req.get('X-Client-Id');
  if (!esUuid(id)) {
    return res.status(400).json({ error: 'Falta un identificador de cliente válido (cabecera X-Client-Id).' });
  }
  req.clienteId = id;
  next();
}

export function crearRouterDocumentos(almacen) {
  const router = Router();
  router.use(identificarCliente);

  router.get('/', async (req, res) => {
    res.status(200).json(await almacen.listar(req.clienteId));
  });

  router.get('/:id', async (req, res) => {
    const doc = await almacen.obtener(req.params.id, req.clienteId);
    if (!doc) return res.status(404).json({ error: 'El documento no existe.' });
    res.status(200).json(doc);
  });

  router.post('/', async (req, res) => {
    const resultado = validarDocumento(req.body);
    if (!resultado.valido) {
      return res.status(400).json({ error: 'Datos inválidos.', detalles: resultado.errores });
    }
    if ((await almacen.contar(req.clienteId)) >= MAX_DOCUMENTOS_POR_CLIENTE) {
      return res.status(409).json({
        error: `Llegaste al límite de ${MAX_DOCUMENTOS_POR_CLIENTE} documentos. Elimina alguno para guardar otro.`,
      });
    }
    const creado = await almacen.crear(req.clienteId, resultado.datos);
    res.status(201).json(creado);
  });

  router.put('/:id', async (req, res) => {
    const resultado = validarDocumento(req.body);
    if (!resultado.valido) {
      return res.status(400).json({ error: 'Datos inválidos.', detalles: resultado.errores });
    }
    const editado = await almacen.actualizar(req.params.id, req.clienteId, resultado.datos);
    if (!editado) return res.status(404).json({ error: 'El documento no existe.' });
    res.status(200).json(editado);
  });

  router.delete('/:id', async (req, res) => {
    const borrado = await almacen.borrar(req.params.id, req.clienteId);
    if (!borrado) return res.status(404).json({ error: 'El documento no existe.' });
    res.status(204).end();
  });

  return router;
}
