const ContratoAlmacen = require("../../../../models/AllModulos/Almacen/Contrato");
const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");
const Sede = require("../../../../models/AllModulos/Almacen/Sede");
const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");
const Employee = require("../../../../models/Employees/Employee");

const getStockAlmacen = async (req, res) => {
  try {
    const { page = 0, limit = 10, search = "" } = req.query;

    const skip = Number(page) * Number(limit);
    const lim = Number(limit);

    const regex = new RegExp(search, "i");

    // Buscar contratos
    const contratos = await ContratoAlmacen.find({
      cliente: regex,
    }).select("_id");

    // Buscar sedes
    const sedes = await Sede.find({
      nombre: regex,
    }).select("_id");

    // Buscar usuarios
    const usuarios = await Employee.find({
      nombre: regex,
    }).select("_id");

    // CORREGIDO: ahora busca por correlativa O numeroDeActa
    const movimientos = await Movimiento.find({
      $or: [
        { correlativa: regex },
        { numeroDeActa: regex },
      ],
    }).select("_id");
    // Query principal
    const query = {
      cantidadDisponible: { $gt: 0 },
      $or: [
        { descripcion: regex },
        // ELIMINADO:
        // { subItem: regex }
        // porque subItem no existe en Stock
        {
          contratoId: {
            $in: contratos.map((x) => x._id),
          },
        },
        {
          sedeId: {
            $in: sedes.map((x) => x._id),
          },
        },
        {
          creadoPor: {
            $in: usuarios.map((x) => x._id),
          },
        },
        {
          movimientoId: {
            $in: movimientos.map((x) => x._id),
          },
        },
      ],
    };

    const [raw_data, total] = await Promise.all([
      StockAlmacen.find(query)
        .populate("contratoId", "cliente")
        .populate("sedeId", "nombre")
        .populate(
          "movimientoId",
          "numeroDeActa correlativa descripcionBienes datosGenerales"
        )
        .populate("creadoPor", "name lastname")
        .populate("historial.actualizadoPor", "name lastname")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),

      StockAlmacen.countDocuments(query),
    ]);

    // ... (mismo inicio del controlador hasta el mapper)

    const data = raw_data.map((stock) => {
      // YA NO necesitamos buscar bienData dentro de movimientoId
      // porque ahora el Stock tiene sus propios campos de peso y medida.

      return {
        _id: stock._id,
        correlativaActa: stock.movimientoId?.correlativa,
        numeroDeActa: stock.movimientoId?.numeroDeActa,
        contrato: stock.contratoId?.cliente || "N/A",
        descripcion: stock.descripcion,
        cantidadDisponible: stock.cantidadDisponible,
        cantidadTotal: stock.cantidadTotal,
        // Agregamos estos campos que vienen del nuevo Schema
        pesoNeto: stock.pesoNeto || 0,
        pesoBruto: stock.pesoBruto || 0,
        unidadDeMedida: stock.unidadDeMedida || "UNIDAD",
        // -------------------------------------------
        historial: stock.historial || [],
        sede: stock.sedeId?.nombre || "N/A",
        creadoPorNombre: stock.creadoPor
          ? `${stock.creadoPor.name} ${stock.creadoPor.lastname}`
          : "N/A",
        fechaIngreso: stock.movimientoId?.datosGenerales?.fecha,
        estado: stock.estado,
      };
    });

    // ... (resto del controlador igual)

    return res.status(200).json({
      data,
      total,
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message,
    });
  }
};
module.exports = getStockAlmacen;