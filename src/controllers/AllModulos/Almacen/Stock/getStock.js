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
        .populate("movimientoId") // Aquí vienen los bienes
        .populate("creadoPor", "name lastname")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      StockAlmacen.countDocuments(query),
    ]);

    // MAPEO DE DATOS RELEVANTES
    const data = raw_data.map(stock => {
      // Buscamos el bien específico dentro del array del movimiento
      const bienData = stock.movimientoId?.descripcionBienes?.find(
        (b) => b._id.toString() === stock.bienId.toString()
      );

      return {
        _id: stock._id,
        correlativa: stock.movimientoId?.correlativa,
        cantidadDisponible: stock.cantidadDisponible,
        numeroDeActa: stock.movimientoId?.numeroDeActa,
        cantidadTotal: stock.cantidadTotal,
        descripcion: stock.descripcion,
        contrato: stock.contratoId?.cliente,
        fechaIngreso: stock.movimientoId?.datosGenerales?.fecha,
        creadoPor: `${stock.creadoPor?.name} ${stock.creadoPor?.lastname}`,
        estado: stock.estado,
        historial: stock.historial,
        // Datos extraídos del subdocumento del bien
        detallesBien: {
          descripcion: bienData?.descripcion || stock.descripcion,
          unidad: bienData?.unidadDeMedida,
          pesoNeto: bienData?.pesoNeto,
          pesoBruto: bienData?.pesoBruto,
          estadoEnvase: bienData?.estadoEnvase,
          subItem: bienData?.subItem
        }
      };
    });

    return res.status(200).json({ data, total });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
module.exports = getStockAlmacen;