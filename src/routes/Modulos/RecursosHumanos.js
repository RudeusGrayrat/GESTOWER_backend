const { Router } = require("express");
const getContratosPaginacion = require("../../controllers/Contracts/getContratosPaginacion");
const getBusinessPaginacion = require("../../controllers/AllModulos/RecursosHumanos/Business/getBussinessPaginacion");

const recursosHumanosRouter = Router();

recursosHumanosRouter.get("/getContratosPaginacion", getContratosPaginacion);
recursosHumanosRouter.get("/getBusinessPaginacion", getBusinessPaginacion);

module.exports = recursosHumanosRouter;
