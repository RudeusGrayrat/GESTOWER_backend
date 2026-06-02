const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");
const escapeRegExp = require("../../../../utils/regex/regex");

const getMovimientoByCodigo = async (req, res) => {
  // Ya no necesitamos el parámetro 'movimiento' desde el frontend, 
  // porque este controlador es exclusivo para buscar INGRESOS.
  const { page = 0, limit = 10, search = "" } = req.query;

  try {
    // REGLA DE ORO: Solo ingresos y solo aprobados
    const query = {
      movimiento: "INGRESO",
      estado: "APROBADO"
    };

    if (search) {
      const safeSearch = escapeRegExp(search);
      const regex = new RegExp(safeSearch, "i");

      // Mongoose buscará que cumpla las condiciones de arriba (INGRESO y APROBADO)
      // Y ADEMÁS que el texto coincida con alguno de estos campos
      query.$or = [
        { correlativa: regex },
        { numeroDeActa: regex },
        { codigoIngreso: regex }, // Añadido por si buscan por el código de barras/ingreso
      ];
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