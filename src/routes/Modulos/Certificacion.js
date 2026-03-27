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
const returnPdf = require("../../controllers/AllModulos/RecursosHumanos/Asistencia/colaborador/returnPdf");
const getGeneradoresByTransportista = require("../../controllers/AllModulos/Certificaciones/Transportistas/getGeneradoresByTransportista");
const patchTransportista = require("../../controllers/AllModulos/Certificaciones/Transportistas/patchTransportista");
const patchGenerador = require("../../controllers/AllModulos/Certificaciones/Generadores/patchGenerador");

const certificacionesRouter = Router();

certificacionesRouter.get("/getGeneradoresPaginacion", getGeneradoresPaginacion);
certificacionesRouter.get("/getManifiestosPaginacion", getManifiestosPaginacion);
certificacionesRouter.get("/getGeneradoresByTransportista/:transportistaId", getGeneradoresByTransportista);
certificacionesRouter.get("/getTransportistasPaginacion", getTransportistaPagination);
certificacionesRouter.get("/getDestinosPaginacion", getDestinoPagination);
certificacionesRouter.get("/getUbigeoPaginacion", getUbigeoPagination);

certificacionesRouter.post("/postGenerador", postGenerador);
certificacionesRouter.post("/postManifiesto", postManifiesto);
certificacionesRouter.post("/postTransportista", postTransportista);
certificacionesRouter.post("/postUbigeo", postUbigeo);
certificacionesRouter.post("/postUbigeosBatch", postUbigeosBatch);
certificacionesRouter.post("/postDestino", postDestino);
certificacionesRouter.post("/returnPdf", returnPdf);

certificacionesRouter.patch("/editTransportista/:transportistaId", patchTransportista)
certificacionesRouter.patch("/editGenerador/:generadorId", patchGenerador)

module.exports = certificacionesRouter;