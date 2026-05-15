const { Router } = require("express");
const getStockByMovimientoId = require("../../controllers/AllModulos/Almacen/Stock/getStockByMovimeintoId");


const almacenLurinRouter = Router();

almacenLurinRouter.get("/getStockByMovimientoId/:movimientoId", getStockByMovimientoId)

module.exports = almacenLurinRouter;