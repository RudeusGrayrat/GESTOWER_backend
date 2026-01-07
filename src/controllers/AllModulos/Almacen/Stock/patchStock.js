const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");

const patchStockAlmacen = async (req, res) => {
  try {
    const {
      _id,
      productoId,
      ubicacionId,
      cantidadTotal,
      cantidadDisponible,
      movimientoId,
      sedeId,
      contratoId,
      actualizadoPor,
    } = req.body;
    if (!_id && !productoId) {
      return res.status(400).json({
        message: "ID del Stock o Producto es requerido",
      });
    }

    const findStock = await StockAlmacen.findOne(
      _id ? { _id } : { productoId }
    );
    if (productoId) findStock.productoId = productoId;
    if (ubicacionId) findStock.ubicacionId = ubicacionId;
    if (cantidadTotal) findStock.cantidadTotal = cantidadTotal;
    if (cantidadDisponible)
      findStock.cantidadDisponible = cantidadDisponible;
    if (movimientoId) findStock.movimientoId = movimientoId;
    if (sedeId) findStock.sedeId = sedeId;
    if (contratoId) findStock.contratoId = contratoId;
    if (actualizadoPor) findStock.actualizadoPor = actualizadoPor;
    const response = await findStock.save();

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = patchStockAlmacen;
