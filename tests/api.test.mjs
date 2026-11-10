// Pruebas de la API con el ejecutor de pruebas incluido en Node (node:test).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createApp } from '../server/app.mjs';
import { crearAlmacen } from '../server/store.mjs';

let servidor, base, servidorCitas, urlCitas, carpeta;
const cliente = randomUUID();
const otroCliente = randomUUID();

before(async () => {
  carpeta = await mkdtemp(path.join(os.tmpdir(), 'md-editor-'));
  // Falso servicio externo de citas
  servidorCitas = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ id: 1, quote: 'Cita de prueba', author: 'Autor de prueba' }));
  });
  await new Promise((r) => servidorCitas.listen(0, r));
  urlCitas = `http://127.0.0.1:${servidorCitas.address().port}/quotes/random`;

  const app = createApp({
    almacen: crearAlmacen(path.join(carpeta, 'docs.json')),
    publicDir: path.join(import.meta.dirname, '..', 'public'),
    allowedOrigins: ['http://localhost:5500'],
    quotesApiUrl: urlCitas,
    registrar: false,
  });
  servidor = http.createServer(app);
  await new Promise((r) => servidor.listen(0, r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  servidor.close();
  servidorCitas.close();
  await rm(carpeta, { recursive: true, force: true });
});

async function llamar(ruta, { metodo = 'GET', cuerpo, cabeceras = {}, id = cliente, crudo } = {}) {
  const h = { ...cabeceras };
  if (id) h['X-Client-Id'] = id;
  const opciones = { method: metodo, headers: h };
  if (cuerpo !== undefined) { h['Content-Type'] = 'application/json'; opciones.body = JSON.stringify(cuerpo); }
  if (crudo !== undefined) { h['Content-Type'] = 'application/json'; opciones.body = crudo; }
  const r = await fetch(base + ruta, opciones);
  const texto = await r.text();
  return { estado: r.status, cabeceras: r.headers, datos: texto ? JSON.parse(texto) : null };
}

test('GET /api/health responde 200', async () => {
  const r = await llamar('/api/health', { id: null });
  assert.equal(r.estado, 200);
  assert.equal(r.datos.estado, 'ok');
});

test('documentos sin X-Client-Id -> 400', async () => {
  const r = await llamar('/api/documents', { id: null });
  assert.equal(r.estado, 400);
});

test('POST con datos inválidos -> 400 con detalles', async () => {
  const r = await llamar('/api/documents', { metodo: 'POST', cuerpo: { titulo: '   ', contenido: 5 } });
  assert.equal(r.estado, 400);
  assert.equal(r.datos.detalles.length, 2);
});

test('JSON mal formado -> 400', async () => {
  const r = await llamar('/api/documents', { metodo: 'POST', crudo: '{esto no es json' });
  assert.equal(r.estado, 400);
});

test('ciclo completo: crear, listar, leer, editar, borrar', async () => {
  const creado = await llamar('/api/documents', { metodo: 'POST', cuerpo: { titulo: ' Mi nota ', contenido: '# Hola' } });
  assert.equal(creado.estado, 201);
  assert.equal(creado.datos.titulo, 'Mi nota'); // se recorta
  assert.equal(creado.datos.propietario, undefined); // no se filtra el propietario
  const id = creado.datos.id;

  const lista = await llamar('/api/documents');
  assert.equal(lista.estado, 200);
  assert.equal(lista.datos.length, 1);
  assert.equal(lista.datos[0].contenido, undefined); // la lista solo trae el resumen

  const uno = await llamar(`/api/documents/${id}`);
  assert.equal(uno.estado, 200);
  assert.equal(uno.datos.contenido, '# Hola');

  const editado = await llamar(`/api/documents/${id}`, { metodo: 'PUT', cuerpo: { titulo: 'Nota 2', contenido: '## Nuevo' } });
  assert.equal(editado.estado, 200);
  assert.equal(editado.datos.titulo, 'Nota 2');

  const ajeno = await llamar(`/api/documents/${id}`, { id: otroCliente });
  assert.equal(ajeno.estado, 404); // otro navegador no ve este documento

  const borrado = await llamar(`/api/documents/${id}`, { metodo: 'DELETE' });
  assert.equal(borrado.estado, 204);
  const otraVez = await llamar(`/api/documents/${id}`);
  assert.equal(otraVez.estado, 404);
});

test('CORS: origen no permitido -> 403', async () => {
  const r = await llamar('/api/health', { id: null, cabeceras: { Origin: 'https://sitio-malicioso.com' } });
  assert.equal(r.estado, 403);
});

test('CORS: origen permitido recibe la cabecera', async () => {
  const r = await llamar('/api/health', { id: null, cabeceras: { Origin: 'http://localhost:5500' } });
  assert.equal(r.estado, 200);
  assert.equal(r.cabeceras.get('access-control-allow-origin'), 'http://localhost:5500');
});

test('CORS: preflight OPTIONS permite X-Client-Id', async () => {
  const r = await fetch(`${base}/api/documents`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:5500', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-client-id' },
  });
  assert.equal(r.status, 204);
  assert.match(r.headers.get('access-control-allow-headers'), /X-Client-Id/i);
});

test('GET /api/quotes/random -> 200 con texto y autor', async () => {
  const r = await llamar('/api/quotes/random', { id: null });
  assert.equal(r.estado, 200);
  assert.deepEqual(r.datos, { texto: 'Cita de prueba', autor: 'Autor de prueba' });
});

test('si la API externa falla -> 502', async () => {
  servidorCitas.close();
  const r = await llamar('/api/quotes/random', { id: null });
  assert.equal(r.estado, 502);
  assert.ok(r.datos.error);
});

test('ruta /api desconocida -> 404 JSON', async () => {
  const r = await llamar('/api/no-existe', { id: null });
  assert.equal(r.estado, 404);
  assert.ok(r.datos.error);
});
