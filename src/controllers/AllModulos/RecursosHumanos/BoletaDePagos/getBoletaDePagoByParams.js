const Employee = require("../../../../models/Employees/Employee");
const BoletaDePagos = require("../../../../models/RecursosHumanos/BoletaDePago");
const escapeRegExp = require("../../../../utils/regex/regex");

const getBoletaDePagoByParams = async (req, res) => {
  const {
    page = 0,
    limit = 10,
    search = "",
    empresa = "",
    fechaBoletaDePago = "",
  } = req.query;

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

      // Paso 2: usar esos IDs en la búsqueda principal
      query.$or = [
        { colaborador: { $in: colaboradoresIds } },
        { state: regex },
        { fechaBoletaDePago: regex },
        { envio: regex },
        { recepcion: regex },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$correlativa" },
              regex: search,
              options: "i",
            },
          },
        },
      ];
    }
    if (empresa) {

      const empleadosEmpresa = await Employee.find({
        business: empresa,
      }).select("_id");

      const empleadosEmpresaIds = empleadosEmpresa.map((e) => e._id);

      // Si ya hay una condición $or por búsqueda, la combinamos
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { colaborador: { $in: empleadosEmpresaIds } },
        ];
        delete query.$or;
      } else {
        query.colaborador = { $in: empleadosEmpresaIds };
      }
    }
    if (fechaBoletaDePago) {
      const regex = new RegExp(escapeRegExp(fechaBoletaDePago), "i");
      query.fechaBoletaDePago = regex;
    }

    const [data, total] = await Promise.all([
      BoletaDePagos.find(query)
        .populate("colaborador")
        .skip(page * limit)
        .limit(limit)
        .sort({ correlativa: -1 })
        .lean(),
      BoletaDePagos.countDocuments(query),
    ]);

    return res.json({ data, total });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Error al obtener las boletas de pago",
    });
  }
};

module.exports = getBoletaDePagoByParams;
