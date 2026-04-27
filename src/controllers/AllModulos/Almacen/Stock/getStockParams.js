const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");

const getStockByParams = async (req, res) => {
  try {
    const { contratoId, bienId, movimientoId } = req.query; // MODIFICADO

    const query = {};

    if (contratoId) query.contratoId = contratoId;
    if (bienId) query.bienId = bienId; // MODIFICADO
    if (movimientoId) query.movimientoId = movimientoId; // MODIFICADO

    const Stock = await StockAlmacen.find(query)
      .populate("movimientoId");

    return res.status(200).json({
      message: "Stock obtenidos correctamente",
      data: Stock,
      type: "Correcto",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Error al buscar la Stock", type: "Error" });
  }
};

module.exports = getStockByParams;