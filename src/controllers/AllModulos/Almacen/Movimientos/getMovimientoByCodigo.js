const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");
const escapeRegExp = require("../../../../utils/regex/regex");

const getMovimientoByCodigo = async (req, res) => {
  const { page = 0,
    limit = 10,
    search = "" } = req.query;

  try {
    const query = {};
    query.movimiento = "INGRESO";
    query.estado = "APROBADO";
    if (search) {
      const safeSearch = escapeRegExp(search);
      const regex = new RegExp(safeSearch, "i");
      const movimientos = await Movimiento.find({
        $or: [
          { movimiento: regex },
          { correlativa: regex },
          { numeroDeActa: regex },
        ]
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
        .lean(),
      Movimiento.countDocuments(query),
    ]);

    return res.status(200).json({ data, total });
  } catch (error) {
    console.error("Error al obtener los movimientos por código:", error);
    return res
      .status(500)
      .json({ message: error.message || "Error al obtener los movimientos" });
  }
};

module.exports = getMovimientoByCodigo;
