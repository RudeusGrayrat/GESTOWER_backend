const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const PizZip = require("pizzip");
const Manifiesto = require("../src/models/AllModulos/Certificacion/Manifiestos");
const Destino = require("../src/models/AllModulos/Certificacion/Destino");
const Transportista = require("../src/models/AllModulos/Certificacion/Transportistas");
const Generador = require("../src/models/AllModulos/Certificacion/Generadores");
const UserExternal = require("../src/models/ManifesTower/UserExternal");
const Vinculacion = require("../src/models/ManifesTower/Vinculacion");
const NotificationService = require("../src/controllers/Herramientas/Notification/CreateNotification");
const snapshotFirma = require("../src/utils/manifiestoFirmaSnapshot");
const verificar = require("../src/controllers/AllModulos/Certificaciones/Manifiestos/verificarManifiesto");
const aprobarGenerador = require("../src/controllers/AllModulos/Certificaciones/ManifesTower/approveFirma");
const enviar = require("../src/controllers/AllModulos/Certificaciones/ManifesTower/envioManifiesto");
const convertDocx = require("../src/utils/convertDocx");

const firma = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLkNwAAAABJRU5ErkJggg==";
const id = "0123456789abcdef01234567";
const respuesta = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } });

test("conserva imágenes y rechaza formatos o servidores no permitidos", async () => {
    assert.equal(await snapshotFirma(firma), firma);
    await assert.rejects(snapshotFirma("https://example.com/firma.png"), /Cloudinary/);
    await assert.rejects(snapshotFirma("data:image/png;base64,YWJj"), /imagen PNG o JPEG/);
});

test("la aprobación usa la firma del destino, registra snapshots y notifica a ambas empresas", async (t) => {
    const documento = new Manifiesto({ estado: "ENVIADO", numeroManifiesto: "PRUEBA", generadorId: id, transportistaId: id, destinoId: id });
    t.mock.method(documento, "save", async () => documento);
    t.mock.method(Manifiesto, "findById", async () => documento);
    t.mock.method(Destino, "findById", async () => ({ responsables: [{ nombre: "Destino", dni: "1", cargo: "Responsable", firmaResponsable: firma }] }));
    t.mock.method(Transportista, "findById", async () => ({ responsables: [{ nombre: "Transportista", dni: "2", cargo: "Responsable", firmaResponsable: firma }] }));
    t.mock.method(Generador, "findById", async () => ({ responsablesTecnicos: [{ nombreResponsable: "Generador", dniResponsable: "3", cargoResponsable: "Responsable", firmaResponsable: firma }] }));
    t.mock.method(UserExternal, "find", () => ({ select: () => ({ lean: async () => [
        { _id: "uno", generadorId: id, roles: ["GENERADOR"] },
        { _id: "dos", transportistaId: id, roles: ["TRANSPORTISTA"] },
    ] }) }));
    const entregadas = [];
    t.mock.method(NotificationService, "send", async (_io, data) => { entregadas.push(data); });
    const res = respuesta();
    await verificar({ params: { id }, body: { estado: "APROBADO", usuarioId: id, referendoRecepcion: { responsableEorsDestino: "FALSO" } }, app: { get: () => ({}) } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(documento.referendoRecepcion.responsableEorsDestino, "Destino");
    assert.equal(documento.referendoRecepcion.firmaGenerador, firma);
    assert.equal(documento.otrasObligaciones.firmaRepresentanteEors, firma);
    assert.equal(documento.eventosFirma[0].identidadVerificada, false);
    assert.deepEqual(documento.eventosFirma[0].responsables.map((r) => r.rol), ["DESTINO", "TRANSPORTISTA_DEVOLUCION", "GENERADOR_DEVOLUCION"]);
    assert.equal(entregadas.length, 2);
    assert.equal(res.data.notificacionesPendientes, false);
});

test("no acepta observaciones vacías", async () => {
    const res = respuesta();
    await verificar({ params: { id }, body: { estado: "OBSERVADO", observaciones: " " } }, res);
    assert.equal(res.statusCode, 400);
});

for (const estado of ["OBSERVADO", "RECHAZADO"]) {
    test(`${estado}: conserva el motivo y notifica a los participantes`, async (t) => {
        const documento = new Manifiesto({ estado: "ENVIADO", numeroManifiesto: "PRUEBA", generadorId: id, transportistaId: id, destinoId: id });
        t.mock.method(documento, "save", async () => documento);
        t.mock.method(Manifiesto, "findById", async () => documento);
        t.mock.method(UserExternal, "find", () => ({ select: () => ({ lean: async () => [
            { _id: "uno", generadorId: id, roles: ["GENERADOR"] },
            { _id: "dos", transportistaId: id, roles: ["TRANSPORTISTA"] },
        ] }) }));
        const entregadas = [];
        t.mock.method(NotificationService, "send", async (_io, data) => { entregadas.push(data); });
        const res = respuesta();
        await verificar({ params: { id }, body: { estado, usuarioId: id, observaciones: "Corregir cantidad" }, app: { get: () => ({}) } }, res);
        assert.equal(res.statusCode, 200);
        assert.equal(documento.observacion, "Corregir cantidad");
        assert.equal(documento.estado, estado);
        assert.equal(entregadas.length, 2);
        assert.match(entregadas[0].message, /Corregir cantidad/);
    });
}

test("la aprobación del generador incorpora una copia de su firma y registra el actor declarado", async (t) => {
    const documento = new Manifiesto({ estado: "PENDIENTE", numeroManifiesto: "PRUEBA", generadorId: id, transportistaId: id, destinoId: id });
    t.mock.method(documento, "save", async () => documento);
    t.mock.method(Manifiesto, "findById", () => ({ populate() { return this; }, then(resolve, reject) { return Promise.resolve(documento).then(resolve, reject); } }));
    t.mock.method(Generador, "findById", async () => ({ responsablesTecnicos: [{ nombreResponsable: "Generador", dniResponsable: "3", cargoResponsable: "Responsable", firmaResponsable: firma }] }));
    t.mock.method(UserExternal, "findOne", async () => null);
    t.mock.method(NotificationService, "send", async () => {});
    const res = respuesta();
    await aprobarGenerador({ params: { id }, query: { usuarioId: id }, app: { get: () => ({}) } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(documento.estado, "ENVIADO");
    assert.equal(documento.referendoEntrega.firmaGenerador, firma);
    assert.equal(documento.eventosFirma[0].actorIdDeclarado.toString(), id);
    assert.equal(documento.eventosFirma[0].identidadVerificada, false);
});

test("el envío conserva la firma del transportista y solicita aprobación al generador", async (t) => {
    const documento = new Manifiesto({ estado: "BORRADOR", numeroManifiesto: "PRUEBA", generadorId: id, transportistaId: id, destinoId: id });
    t.mock.method(documento, "save", async () => documento);
    t.mock.method(Manifiesto, "findById", () => ({ populate() { return this; }, then(resolve, reject) { return Promise.resolve(documento).then(resolve, reject); } }));
    t.mock.method(Transportista, "findById", async () => ({ responsables: [{ nombre: "Transportista", dni: "2", cargo: "Responsable", firmaResponsable: firma }] }));
    t.mock.method(Vinculacion, "findOne", async () => ({ tienePermisoLlenado: false }));
    t.mock.method(UserExternal, "find", () => ({ select: () => ({ lean: async () => [{ _id: id }] }) }));
    t.mock.method(NotificationService, "send", async () => {});
    const res = respuesta();
    await enviar({ params: { id }, user: { _id: id }, app: { get: () => ({}) } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(documento.estado, "PENDIENTE");
    assert.equal(documento.referendoEntrega.firmaResponsableEors, firma);
    assert.equal(documento.eventosFirma[0].accion, "ENVIO_TRANSPORTISTA");
});

test("la plantilla final inserta las cinco imágenes de firma", async () => {
    const archivo = path.join(__dirname, "../templates/PLANTILLA_MANIFIESTO_WORD.docx");
    const firmas = { firma_generador: firma, firma_transportista: firma, firma_destino: firma, firma_representante_eors: firma, firma_responsable_generador: firma };
    const salida = await convertDocx(firmas, archivo);
    const zip = new PizZip(salida);
    const original = new PizZip(fs.readFileSync(archivo));
    const xml = zip.file("word/document.xml").asText();
    assert.doesNotMatch(xml, /\{\{%firma_/);
    const contarMedios = (z) => Object.keys(z.files).filter((nombre) => nombre.startsWith("word/media/") && !z.files[nombre].dir).length;
    assert.ok(contarMedios(zip) >= contarMedios(original) + 5);
});

