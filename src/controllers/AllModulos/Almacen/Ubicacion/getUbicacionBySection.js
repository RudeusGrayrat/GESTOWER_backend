const Ubicacion = require("../../../../models/AllModulos/Almacen/Ubicacion");

const getUbicacionByParams = async (req, res) => {
  try {
    const { zonaId, rack, nivel, seccion, almacenId } = req.query;
    const query = {};

    if (zonaId) query.zonaId = zonaId;
    if (rack) query.rack = rack;
    if (nivel) query.nivel = parseInt(nivel);
    if (seccion) query.seccion = parseInt(seccion);

    let ubicaciones = await Ubicacion.find(query)
      .populate("zonaId")
      .populate({
        path: "bienes.stockId",
        populate: { path: "movimientoId", select: "correlativa numeroDeActa" }
      });

    if (almacenId) {
      ubicaciones = ubicaciones.filter(
        (u) => u.zonaId && u.zonaId.almacenId?.toString() === almacenId
      );
    }

    if (!ubicaciones.length) {
      return res.status(404).json({ message: "Ubicación no encontrada", type: "Error" });
    }

    return res.status(200).json(ubicaciones);
  } catch (err) {
    return res.status(500).json({ message: err.message, type: "Error" });
  }
};

module.exports = getUbicacionByParams;