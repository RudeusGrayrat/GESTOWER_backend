const BoletaDePagos = require("../../../../models/RecursosHumanos/BoletaDePago");

const getBoletaDePagos = async (req, res) => {
  const { desde, hasta, empresa } = req.query;
  const query = {};
  try {
    const matchQuery = {};
    if (desde && hasta) {
      matchQuery.fechaBoletaDePago = { $gte: desde, $lte: hasta };
    }
    // Si 'empresa' viene, filtramos por el campo empresaColaborador (que ya es ObjectId)
    if (empresa) {
      matchQuery.empresaColaborador = new mongoose.Types.ObjectId(empresa);
    }
    const boletas = await BoletaDePagos.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: "employees",
          localField: "colaborador",
          foreignField: "_id",
          as: "colaborador"
        }
      },
      { $unwind: "$colaborador" },
      {
        $lookup: {
          from: "businesses", // Asegúrate de que el nombre de la colección sea correcto
          localField: "empresaColaborador",
          foreignField: "_id",
          as: "empresaColaborador"
        }
      },
      { $unwind: { path: "$empresaColaborador", preserveNullAndEmptyArrays: true } }
    ]);

    return res.status(200).json(boletas);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = getBoletaDePagos;
