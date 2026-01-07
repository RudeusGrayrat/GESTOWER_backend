const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");

const getStockByParams = async (req, res) => {
  try {
    const { contratoId, productoId } = req.query;
    console.log("Params recibidos:", req.query);
    const query = {};
    if (contratoId) query.contratoId = contratoId;
    //ahora ya no estrá la ubicación en stock
    if (productoId) query.productoId = productoId;

    const Stock = await StockAlmacen.find(query)
      .populate("productoId")
      .populate("movimientoId");
    console.log("Stock:", Stock);
    return res.status(200).json({
      message: "Stock obtenidos correctamente",
      data: Stock,
      type: "Correcto",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Error al buscar la Stock" });
  }
};

module.exports = getStockByParams;
