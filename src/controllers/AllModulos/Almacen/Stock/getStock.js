const ContratoAlmacen = require("../../../../models/AllModulos/Almacen/Contrato");
const ProductoAlmacen = require("../../../../models/AllModulos/Almacen/Producto");
const Sede = require("../../../../models/AllModulos/Almacen/Sede");
const StockAlmacen = require("../../../../models/AllModulos/Almacen/Stock");
const Employee = require("../../../../models/Employees/Employee");

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
const getStockAlmacen = async (req, res) => {
  try {
    const { page, limit, search = "" } = req.query;

    const skip = page && limit ? page * limit : 0;
    const lim = limit ? parseInt(limit) : 0;

    const regex = search ? new RegExp(search, "i") : null;

    let productoIds = [];
    let contratoIds = [];
    let sedeIds = [];
    let userIds = [];

    if (regex !== null) {
      // Buscar productos por nombre o código
      const productos = await ProductoAlmacen.find({
        $or: [{ nombre: regex }, { codigo: regex }, { descripcion: regex }],
      }).select("_id");
      productoIds = productos.map((p) => p._id);

      // Buscar contratos
      const contratos = await ContratoAlmacen.find({
        $or: [{ nombre: regex }, { codigo: regex }],
      }).select("_id");
      contratoIds = contratos.map((c) => c._id);

      // Buscar sedes
      const sedes = await Sede.find({
        $or: [{ nombre: regex }, { direccion: regex }],
      }).select("_id");
      sedeIds = sedes.map((s) => s._id);

      // Buscar usuarios
      const usuarios = await Employee.find({
        $or: [{ nombre: regex }, { email: regex }],
      }).select("_id");
      userIds = usuarios.map((u) => u._id);
    }

    // Armar la query de Stock
    const query = {
      ...(regex && {
        $or: [
          { productoId: { $in: productoIds } },
          { contratoId: { $in: contratoIds } },
          { sedeId: { $in: sedeIds } },
          { creadoPor: { $in: userIds } },
        ],
      }),
    };

    let queryExec = StockAlmacen.find(query)
      .populate("productoId")
      .populate("contratoId")
      .populate("sedeId")
      .populate("creadoPor")
      .populate("movimientoId")
      .lean()
      .sort({ createdAt: -1 });

    if (lim > 0) {
      queryExec = queryExec.skip(skip).limit(lim);
    }

    const [data, total] = await Promise.all([
      queryExec,
      StockAlmacen.countDocuments(query),
    ]);

    return res.status(200).json({ data, total });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Error al buscar stockAlmacen" });
  }
};

module.exports = getStockAlmacen;
