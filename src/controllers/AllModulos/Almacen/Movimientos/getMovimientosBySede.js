const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
const getAllMovimientosBySede = async (req, res) => {
  const {
    contratoId,
    movimiento,
    page = 0,
    limit = 10,
    search = "",
  } = req.query;

  try {
    if (!contratoId) {
      return res.status(400).json({
        message: "Falta el ID del contrato para filtrar los movimientos",
      });
    }
    const query = { contratoId };
    if (movimiento && movimiento !== "TODOS") {
      query.movimiento = movimiento;
    }
    if (search) {
      const safeSearch = escapeRegExp(search);
      const regex = new RegExp(safeSearch, "i");
      const movimientos = await Movimiento.find({
        $or: [
          { movimiento: regex },
          { correlativa: regex },
          { numeroDeActa: regex },
          { contribuyente: regex },
          { "datosGenerales.fecha": regex },
          { "datosGenerales.recepcionadoPor": regex },
          { "datosGenerales.responsableEntrega": regex },
        ],
      }).select("_id");

      const movimientosIds = movimientos.map((c) => c._id);
      query.$or = [{ _id: { $in: movimientosIds } }];
    }
    const [data, total] = await Promise.all([
      Movimiento.find(query)
        .skip(page * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .populate("contratoId")
        .populate("sedeId")
        .populate("creadoPor", "name lastname email")
        .populate("aprobadoPor", "name lastname email")
        .lean(),
      Movimiento.countDocuments(query),
    ]);

    return res.json({ data, total });
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Error al obtener los movimientos" });
  }
};

module.exports = getAllMovimientosBySede;
