// controllers/ubicacion/getUbicacionByParams.js

const Ubicacion = require("../../../../models/AllModulos/Almacen/Ubicacion");

const getUbicacionByParams = async (req, res) => {
  try {
    const { zonaId, rack, nivel, seccion, almacenId } = req.query;

    const query = {};

    if (zonaId) query.zonaId = zonaId;
    if (rack) query.rack = rack;
    if (nivel) query.nivel = parseInt(nivel);
    if (seccion) query.seccion = parseInt(seccion);

    let ubicacion = await Ubicacion.find(query)
      .populate("zonaId")
      // CAMBIO: antes era productos.productoId
      .populate("bienes.movimientoId");

    // CAMBIO: filtro por almacenId si se envía
    if (almacenId) {
      ubicacion = ubicacion.filter(
        (u) => u.zonaId && u.zonaId.almacenId?.toString() === almacenId
      );
    }

    // CAMBIO: validación correcta para arrays
    if (!ubicacion.length) {
      return res.status(404).json({ message: "Ubicación no encontrada" });
    }

    return res.status(200).json(ubicacion);
  } catch (err) {
    console.error("Error en getUbicacionByParams:", err);

    return res.status(500).json({
      message: err.message || "Error al buscar la ubicación",
    });
  }
};

module.exports = getUbicacionByParams;