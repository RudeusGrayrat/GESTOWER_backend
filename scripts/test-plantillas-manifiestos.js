const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Plantilla = require("../src/models/RecursosHumanos/PlantillasRH");
const seleccionar = require("../src/utils/plantillaManifiesto");
const permiso = require("../src/controllers/Herramientas/Plantillas/permisoPlantillas");
const crear = require("../src/controllers/Herramientas/Plantillas/postPlantilla");
const editar = require("../src/controllers/Herramientas/Plantillas/patchPlantilla");
const { prepararDatosManifiesto } = require("../src/utils/prepararDatosManifiesto");
const validador = require("../src/controllers/Herramientas/Plantillas/validarPlantillaManifiesto");

const respuesta = () => ({ statusCode: 200, status(n) { this.statusCode = n; return this; }, json(data) { this.data = data; return this; } });

test("sin plantilla activa no busca archivos DOCX dentro del repositorio", async (t) => {
  t.mock.method(Plantilla, "findOne", () => ({ sort: async () => null }));
  await assert.rejects(seleccionar(), /No hay una plantilla de manifiesto activa/);
});

test("una plantilla activa es compartida por todas las etapas y debe existir", async (t) => {
  let filtro;
  t.mock.method(Plantilla, "findOne", (f) => { filtro = f; return { sort: async () => ({ archivo: "/uploads/plantillas/prueba.docx" }) }; });
  const existe = t.mock.method(fs, "existsSync", () => true);
  assert.equal(path.basename(await seleccionar()), "prueba.docx");
  assert.deepEqual(filtro, { tipo: "MANIFIESTO", state: "ACTIVO" });
  existe.mock.mockImplementation(() => false);
  await assert.rejects(seleccionar(), /no existe en el servidor/);
});

test("los permisos se verifican en el servidor", () => {
  const usuario = { _id: "empleado", state: "ACTIVO", modules: [{ submodule: { name: "PLANTILLAS", permissions: ["VER", "EDITAR"] } }] };
  let autorizado = false;
  permiso("EDITAR")({ user: usuario }, respuesta(), () => { autorizado = true; });
  assert.equal(autorizado, true);
  const res = respuesta();
  permiso("ELIMINAR")({ user: usuario }, res, () => assert.fail("No debe autorizar"));
  assert.equal(res.statusCode, 403);
});

test("crear manifiesto activo desactiva solo otras plantillas de manifiesto", async (t) => {
  t.mock.method(validador, "validar", async () => {});
  let filtro;
  t.mock.method(Plantilla, "updateMany", async (f) => { filtro = f; });
  t.mock.method(Plantilla, "create", async (data) => data);
  const res = respuesta();
  await crear({ body: { nombre: "Manifiesto", tipo: "MANIFIESTO" }, file: { filename: "nuevo.docx", originalname: "Manifiesto.docx" } }, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(filtro, { tipo: "MANIFIESTO", state: "ACTIVO" });
});

test("si falla el guardado se conserva el archivo anterior", async (t) => {
  t.mock.method(validador, "validar", async () => {});
  const eliminados = [];
  t.mock.method(fs, "existsSync", () => true);
  t.mock.method(fs, "unlinkSync", (p) => eliminados.push(path.basename(p)));
  t.mock.method(Plantilla, "findById", async () => ({ tipo: "MANIFIESTO", archivo: "/uploads/plantillas/anterior.docx", save: async () => { throw new Error("fallo de base de datos"); } }));
  const res = respuesta();
  await editar({ params: { id: "id" }, body: {}, file: { filename: "nuevo.docx", originalname: "nuevo.docx" } }, res);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(eliminados, ["nuevo.docx"]);
});

test("una plantilla inválida no sustituye ni desactiva la anterior", async (t) => {
  const eliminados = [];
  t.mock.method(fs, "existsSync", () => true);
  t.mock.method(fs, "unlinkSync", (p) => eliminados.push(path.basename(p)));
  t.mock.method(validador, "validar", async () => { throw new Error("DOCX inválido"); });
  const desactivar = t.mock.method(Plantilla, "updateMany", async () => {});
  t.mock.method(Plantilla, "findById", async () => ({ tipo: "MANIFIESTO", archivo: "/uploads/plantillas/anterior.docx" }));
  const res = respuesta();
  await editar({ params: { id: "id" }, body: { state: "ACTIVO" }, file: { filename: "nuevo.docx" } }, res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(eliminados, ["nuevo.docx"]);
  assert.equal(desactivar.mock.calls.length, 0);
});

test("las variantes conocidas de la firma de destino apuntan a la misma imagen", () => {
  const datos = prepararDatosManifiesto({ firma_destino: "firma" });
  assert.equal(datos.firma_destinoXXXX, "firma");
  assert.equal(datos.firma_destinXXXXo, "firma");
});
