const { Router } = require("express");
const getStockByMovimientoId = require("../../controllers/AllModulos/Almacen/Stock/getStockByMovimeintoId");
const { generarPDFMovimientoAlmacen } = require("../../controllers/AllModulos/Almacen/Movimientos/generarMovimientoPdf");


const almacenLurinRouter = Router();

almacenLurinRouter.get("/getStockByMovimientoId/:movimientoId", getStockByMovimientoId)
almacenLurinRouter.get("/getPDFMovimiento/:movimientoId", generarPDFMovimientoAlmacen)

module.exports = almacenLurinRouter;