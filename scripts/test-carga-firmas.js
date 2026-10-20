const test = require("node:test");
const assert = require("node:assert/strict");
const validarFirmaCarga = require("../src/utils/validarFirmaCarga");
const cloud = require("../src/utils/cloudinary/images");
const Generador = require("../src/models/AllModulos/Certificacion/Generadores");
const Transportista = require("../src/models/AllModulos/Certificacion/Transportistas");
const Notification = require("../src/controllers/Herramientas/Notification/CreateNotification");

const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLkNwAAAABJRU5ErkJggg==";
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } });

test("solo acepta bytes PNG o JPEG y un máximo de 1 MB, incluido Base64 histórico", async () => {
    assert.deepEqual(await validarFirmaCarga(png), Buffer.from(png, "base64"));
    assert.deepEqual(await validarFirmaCarga(`data:image/png;base64,${png}`), Buffer.from(png, "base64"));
    await assert.rejects(validarFirmaCarga("data:image/webp;base64,UklGRg=="), { firmaInvalida: true });
    await assert.rejects(validarFirmaCarga("data:image/png;base64,QUJD"), { firmaInvalida: true });
    await assert.rejects(validarFirmaCarga(`data:image/png;base64,${Buffer.alloc(1024 * 1024 + 1).toString("base64")}`), { firmaInvalida: true });
});

test("una firma inválida no se sube ni reemplaza la anterior de generador o transportista", async (t) => {
    let subidas = 0, borrados = 0, guardados = 0;
    t.mock.method(cloud, "uploadImage", async (buffer, nombre) => {
        subidas++;
        assert.deepEqual(buffer, Buffer.from(png, "base64"));
        return { secure_url: `https://res.cloudinary.com/demo/image/upload/v1/${nombre}.png` };
    });
    t.mock.method(cloud, "deleteImage", async () => { borrados++; });
    const patchGenerador = require("../src/controllers/AllModulos/Certificaciones/Generadores/patchGenerador");
    const patchTransportista = require("../src/controllers/AllModulos/Certificaciones/Transportistas/patchTransportista");
    const urlAnterior = "https://res.cloudinary.com/demo/image/upload/v1/firma.png";
    const gen = { responsablesTecnicos: [{ dniResponsable: "123", firmaResponsable: urlAnterior }], async save() { guardados++; return this; } };
    const trans = { responsables: [{ dni: "123", firmaResponsable: urlAnterior }], async save() { guardados++; return this; } };
    t.mock.method(Generador, "findById", async () => gen);
    t.mock.method(Transportista, "findById", async () => trans);
    t.mock.method(Notification, "send", async () => {});
    const app = { get: () => ({}) };
    const r1 = response();
    await patchGenerador({ params: { generadorId: "g" }, body: { responsablesTecnicos: [{ dniResponsable: "123", firmaResponsable: "data:image/gif;base64,R0lGODlh" }] }, app }, r1);
    const r2 = response();
    await patchTransportista({ params: { transportistaId: "t" }, body: { responsables: [{ dni: "123", firmaResponsable: "data:image/gif;base64,R0lGODlh" }] }, app }, r2);
    assert.equal(r1.statusCode, 400);
    assert.equal(r2.statusCode, 400);
    assert.equal(gen.responsablesTecnicos[0].firmaResponsable, urlAnterior);
    assert.equal(trans.responsables[0].firmaResponsable, urlAnterior);
    assert.equal(guardados, 0);
    assert.equal(subidas, 0);
    assert.equal(borrados, 0);
    const r3 = response();
    await patchGenerador({ params: { generadorId: "g" }, body: { responsablesTecnicos: [{ dniResponsable: "123", firmaResponsable: `data:image/png;base64,${png}` }] }, app }, r3);
    const r4 = response();
    await patchTransportista({ params: { transportistaId: "t" }, body: { responsables: [{ dni: "123", firmaResponsable: png }] }, app }, r4);
    assert.equal(r3.statusCode, 200);
    assert.equal(r4.statusCode, 200);
    assert.equal(subidas, 2);
    assert.equal(guardados, 2);
    assert.equal(borrados, 0);
    assert.notEqual(gen.responsablesTecnicos[0].firmaResponsable, urlAnterior);
    assert.notEqual(trans.responsables[0].firmaResponsable, urlAnterior);
});
