const mongoose = require("mongoose");
const Ubicacion = require("../../../../models/AllModulos/Almacen/Ubicacion");
const Stock = require("../../../../models/AllModulos/Almacen/Stock");

const getStockByParams = async (req, res) => {
  try {
    const { contratoId, almacenId, zonaId, ubicado } = req.query;
    let query = { contratoId: contratoId };

    if (ubicado !== undefined) query.ubicado = ubicado === "true";

    // FILTRO DE UBICACIÓN (Nave o Zona)
    // Si filtran por Nave o Zona, buscamos los IDs de las ubicaciones que cumplen eso
    if (almacenId || zonaId) {
      const ubicacionQuery = {};
      if (zonaId) {
        ubicacionQuery.zonaId = zonaId;
      } else if (almacenId) {
        // Si solo hay almacenId, buscamos todas las zonas de esa nave primero
        const zonas = await mongoose.model("Zona").find({ almacenId }).select("_id");
        ubicacionQuery.zonaId = { $in: zonas.map(z => z._id) };
      }

      const idsUbicaciones = await Ubicacion.find(ubicacionQuery).select("_id");
      query.ubicaciones = { $in: idsUbicaciones.map(u => u._id) };
    }

    const stocks = await Stock.find(query)
      .populate("movimientoId",
        "correlativa numeroDeActa datosGenerales.fecha contribuyente numeroDocumento")
      .populate({
        path: "ubicaciones",
        populate: {
          path: "zonaId",
          select: "nombre almacenId",
          populate: { path: "almacenId", select: "nombre" }
        }
      })
      .lean();

    return res.status(200).json({
      type: "Correcto",
      data: stocks,
    });
  } catch (err) {
    return res.status(500).json({ type: "Error", message: err.message });
  }
};

module.exports = getStockByParams;