const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");

const postStockAlmacen = async (req, res) => {
  const {
    movimientoId,
    sedeId,
    contratoId,
    item,
    descripcion,
    unidadDeMedida,
    subItem,
    cantidadTotal,
    cantidadDisponible,
    observaciones,
    creadoPor,
  } = req.body;

  try {
    if (
      !movimientoId ||
      !sedeId ||
      !contratoId ||
      !item ||
      !descripcion ||
      !unidadDeMedida ||
      cantidadTotal === undefined ||
      cantidadDisponible === undefined
    ) {
      return res.status(400).json({
        message: "Faltan datos requeridos para crear el stock",
        type: "Error",
      });
    }

    const existingStock = await StockAlmacen.findOne({
      movimientoId,
      item,
    });

    if (existingStock) {
      return res.status(409).json({
        message: "Ya existe un stock para este item en este movimiento.",
        type: "Error",
      });
    }

    const nuevaStock = {
      movimientoId,
      sedeId,
      contratoId,
      item,
      descripcion,
      unidadDeMedida,
      subItem,
      cantidadTotal,
      cantidadDisponible,
      observaciones,
      creadoPor,
    };

    const response = await StockAlmacen.create(nuevaStock);

    return res.status(201).json({
      message: "Stock creado exitosamente",
      stock: response,
      type: "Correcto",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error al crear el stock",
      type: "Error",
    });
  }
};

module.exports = postStockAlmacen;