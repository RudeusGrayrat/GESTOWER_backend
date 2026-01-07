const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");

const getMovimientoByCodigo = async (req, res) => {
  const { codigoIngreso } = req.query;

  try {
    if (!codigoIngreso) {
      return res.status(400).json({
        message: "El código de ingreso es requerido",
      });
    }
    const response = await Movimiento.findOne({
      correlativa: String(codigoIngreso),
    })
      .populate("contratoId")
      .populate("creadoPor", "name lastname email")
      .lean();

    return res.status(200).json(response);
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Error al obtener los movimientos" });
  }
};

module.exports = getMovimientoByCodigo;
