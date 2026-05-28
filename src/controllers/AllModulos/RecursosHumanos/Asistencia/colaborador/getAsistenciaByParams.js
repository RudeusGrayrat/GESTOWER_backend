const Employee = require("../../../../../models/Employees/Employee");
const AsistenciaColaborador = require("../../../../../models/RecursosHumanos/AsistenciaColaborador");
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const getAsistenciaByParams = async (req, res) => {
  const { page = 0, limit = 10, search = "" } = req.query;
  try {
    const query = {};
    if (search) {
      const safeSearch = escapeRegExp(search);
      const regex = new RegExp(safeSearch, "i");
      const colaboradores = await Employee.find({
        $or: [
          { name: regex },
          { lastname: regex },
          { business: regex },
          { charge: regex },
        ],
      }).select("_id");

      const colaboradoresIds = colaboradores.map((c) => c._id);
      query.$or = [
        { colaborador: { $in: colaboradoresIds } },
        { estado: regex },
        {fecha: regex},
        {ingreso: regex},
        {salida: regex},
      ];
    }

    const [data, total] = await Promise.all([
      AsistenciaColaborador.find(query)
        .skip(page * limit)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 })
        .populate("colaborador", "name lastname photo")
        .lean(),
      AsistenciaColaborador.countDocuments(query),
    ]);

    return res.status(200).json({ data, total });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Error al buscar las Asistencias" });
  }
};

module.exports = getAsistenciaByParams;
