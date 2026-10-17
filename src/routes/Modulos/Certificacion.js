const { Router } = require("express");
const getGeneradoresPaginacion = require("../../controllers/AllModulos/Certificaciones/Generadores/getGeneradoresPaginacion");
const postGenerador = require("../../controllers/AllModulos/Certificaciones/Generadores/postGenerador");
const postManifiesto = require("../../controllers/AllModulos/Certificaciones/Manifiestos/postManifiesto");
const getManifiestosPaginacion = require("../../controllers/AllModulos/Certificaciones/Manifiestos/getManifiestosPaginacion");
const getTransportistaPagination = require("../../controllers/AllModulos/Certificaciones/Transportistas/getTransportistasPaginacion");
const getDestinoPagination = require("../../controllers/AllModulos/Certificaciones/Destinos/getDestinosPaginacion");
const getUbigeoPagination = require("../../controllers/AllModulos/Certificaciones/Ubigeo/getUbigeoPaginacion");
const postTransportista = require("../../controllers/AllModulos/Certificaciones/Transportistas/postTransportista");
const postUbigeo = require("../../controllers/AllModulos/Certificaciones/Ubigeo/postUbigeo");
const postDestino = require("../../controllers/AllModulos/Certificaciones/Destinos/postDestino");
const postUbigeosBatch = require("../../controllers/AllModulos/Certificaciones/Ubigeo/postUbigeoBatch");
const getGeneradoresByTransportista = require("../../controllers/AllModulos/Certificaciones/Transportistas/getGeneradoresByTransportista");
const patchTransportista = require("../../controllers/AllModulos/Certificaciones/Transportistas/patchTransportista");
const patchGenerador = require("../../controllers/AllModulos/Certificaciones/Generadores/patchGenerador");
const patchDestino = require("../../controllers/AllModulos/Certificaciones/Destinos/patchDestino");
const generarPDFManifiesto = require("../../controllers/AllModulos/Certificaciones/Manifiestos/generarPDFManifiesto");
const patchManifiesto = require("../../controllers/AllModulos/Certificaciones/Manifiestos/patchManifiesto");
const importStockJson = require("../../controllers/AllModulos/Almacen/Stock/postStockJson");
const getTransportistaById = require("../../controllers/AllModulos/Certificaciones/Transportistas/getTransportistaById");
const verificarManifiesto = require("../../controllers/AllModulos/Certificaciones/Manifiestos/verificarManifiesto");
const accesoConsultaManifiesto = require("../../controllers/AllModulos/Certificaciones/ManifesTower/accesoConsultaManifiesto");
const accesoEscrituraManifiesto = require("../../controllers/AllModulos/Certificaciones/ManifesTower/accesoEscrituraManifiesto");

const certificacionesRouter = Router();

certificacionesRouter.get("/getGeneradoresPaginacion", getGeneradoresPaginacion);
certificacionesRouter.get("/getManifiestosPaginacion", accesoConsultaManifiesto.autenticar, accesoConsultaManifiesto.permiso, accesoConsultaManifiesto.filtrar, getManifiestosPaginacion);
certificacionesRouter.get("/getGeneradoresByTransportista/:transportistaId", getGeneradoresByTransportista);
certificacionesRouter.get("/getTransportistasPaginacion", getTransportistaPagination);
certificacionesRouter.get("/getTransportistaById/:id", getTransportistaById);
certificacionesRouter.get("/getDestinosPaginacion", getDestinoPagination);
certificacionesRouter.get("/getUbigeoPaginacion", getUbigeoPagination);
certificacionesRouter.get("/getpdfManifiesto/:id", accesoConsultaManifiesto.autenticar, accesoConsultaManifiesto.permiso, accesoConsultaManifiesto.documento, generarPDFManifiesto);
certificacionesRouter.get("/stockByJson", importStockJson);

certificacionesRouter.post("/postGenerador", postGenerador);
certificacionesRouter.post("/postManifiesto", accesoConsultaManifiesto.autenticar, accesoEscrituraManifiesto.permiso("CREAR", true), accesoEscrituraManifiesto.crear, postManifiesto);
certificacionesRouter.post("/postTransportista", postTransportista);
certificacionesRouter.post("/postUbigeo", postUbigeo);
certificacionesRouter.post("/postUbigeosBatch", postUbigeosBatch);
certificacionesRouter.post("/postDestino", postDestino);

certificacionesRouter.patch("/editTransportista/:transportistaId", patchTransportista)
certificacionesRouter.patch("/editGenerador/:generadorId", patchGenerador)
certificacionesRouter.patch("/editDestino/:destinoId", patchDestino)
certificacionesRouter.patch("/patchManifiesto/:manifiestoId", accesoConsultaManifiesto.autenticar, accesoEscrituraManifiesto.permiso("EDITAR", true), accesoEscrituraManifiesto.editar, patchManifiesto)
certificacionesRouter.patch("/verificarManifiesto/:id", accesoConsultaManifiesto.autenticar, accesoEscrituraManifiesto.permiso("APROBAR", false), verificarManifiesto)

module.exports = certificacionesRouter;
