const ContratoAlmacen = require("../../../../models/AllModulos/Almacen/Contrato");
const Sede = require("../../../../models/AllModulos/Almacen/Sede");
const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");
const Employee = require("../../../../models/Employees/Employee");

const getStockAlmacen = async (req, res) => {
  try {
    const { page = 0, limit = 10, search = "" } = req.query;
    const skip = Number(page) * Number(limit);
    const lim = Number(limit);
    const regex = new RegExp(search, "i");

    const contratos = await ContratoAlmacen.find({
      cliente: regex,
    }).select("_id");

    const sedes = await Sede.find({
      nombre: regex,
    }).select("_id");

    const usuarios = await Employee.find({
      nombre: regex,
    }).select("_id");

    const query = {
      cantidadDisponible: { $gt: 0 },
      $or: [
        { descripcion: regex },
        { subItem: regex },
        { contratoId: { $in: contratos.map((x) => x._id) } },
        { sedeId: { $in: sedes.map((x) => x._id) } },
        { creadoPor: { $in: usuarios.map((x) => x._id) } },
      ],
    };

    const [raw_data, total] = await Promise.all([
      StockAlmacen.find(query)
        .populate("contratoId", "cliente") // Traemos solo lo necesario
        .populate("sedeId", "nombre")
        .populate("movimientoId", "numeroDeActa correlativa descripcionBienes datosGenerales") // Aquí vienen los bienes
        .populate("creadoPor", "name lastname")
        .populate("historial.actualizadoPor", "name lastname") // Para mostrar quién hizo cada actualización en el historial
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      StockAlmacen.countDocuments(query),
    ]);
    console.log("RAW STOCK DATA:", JSON.stringify(raw_data, null, 2)); // Log para verificar la estructura de los datos
    // MAPEO DE DATOS RELEVANTES
    const data = raw_data.map(stock => {
      const bienData = stock.movimientoId?.descripcionBienes?.find(
        (b) => b._id.toString() === stock.bienId.toString()
      );

      return {
        _id: stock._id,
        correlativaActa: stock.movimientoId?.correlativa,
        numeroDeActa: stock.movimientoId?.numeroDeActa,
        contrato: stock.contratoId?.cliente || "N/A",
        descripcion: stock.descripcion,
        cantidadDisponible: stock.cantidadDisponible,
        cantidadTotal: stock.cantidadTotal,
        historial: stock.historial || [],
        sede: stock.sedeId?.nombre || "N/A",
        creadoPorNombre: stock.creadoPor ? `${stock.creadoPor.name} ${stock.creadoPor.lastname}` : "N/A",
        unidadDeMedida: bienData?.unidadDeMedida || "UNIDAD",
        bienData: bienData || null, // Agregamos el bienData completo para mayor contexto
        fechaIngreso: stock.movimientoId?.datosGenerales.fecha,
        estado: stock.estado
      };
    });

    return res.status(200).json({ data, total });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
module.exports = getStockAlmacen;