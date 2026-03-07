const { Router } = require("express");
const getContratosPaginacion = require("../../controllers/Contracts/getContratosPaginacion");
const getBusinessPaginacion = require("../../controllers/AllModulos/RecursosHumanos/Business/getBussinessPaginacion");
const getHorasExtras = require("../../controllers/AllModulos/RecursosHumanos/HorasExtras/getHorasExtrasPaginacion");
const getPermisos = require("../../controllers/AllModulos/RecursosHumanos/Permisos/getPermisosPaginacion");
const postPermiso = require("../../controllers/AllModulos/RecursosHumanos/Permisos/postPermiso");
const postHorasExtras = require("../../controllers/AllModulos/RecursosHumanos/HorasExtras/postHorasExtras");
const patchHorasExtras = require("../../controllers/AllModulos/RecursosHumanos/HorasExtras/patchHorasExtras");
const patchPermiso = require("../../controllers/AllModulos/RecursosHumanos/Permisos/patchPermisos");

const recursosHumanosRouter = Router();

recursosHumanosRouter.get("/getContratosPaginacion", getContratosPaginacion);
recursosHumanosRouter.get("/getBusinessPaginacion", getBusinessPaginacion);
recursosHumanosRouter.get("/getHorasExtrasPaginacion", getHorasExtras);
recursosHumanosRouter.get("/getPermisosPaginacion", getPermisos);

recursosHumanosRouter.post("/postPermiso", postPermiso);
recursosHumanosRouter.post("/postHorasExtras", postHorasExtras);

recursosHumanosRouter.patch("/patchHorasExtras", patchHorasExtras);
recursosHumanosRouter.patch("/patchPermiso", patchPermiso);

module.exports = recursosHumanosRouter;
