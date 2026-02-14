const { Router } = require("express");
const getContratosPaginacion = require("../../controllers/Contracts/getContratosPaginacion");

const recursosHumanosRouter = Router();

recursosHumanosRouter.get("/getContratosPaginacion", getContratosPaginacion);

module.exports = recursosHumanosRouter;
