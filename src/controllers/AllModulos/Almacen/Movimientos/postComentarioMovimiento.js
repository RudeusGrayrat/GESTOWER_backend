const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");

const postComentarioMovimiento = async (req, res) => {
  try {
    const { movimientoId, texto } = req.body;
    if (!movimientoId || !texto?.trim()) return res.status(400).json({ message: "El comentario es obligatorio", type: "Error" });
    const movimiento = await Movimiento.findById(movimientoId);
    if (!movimiento) return res.status(404).json({ message: "Movimiento no encontrado", type: "Error" });

    movimiento.comentarios.push({ texto: texto.trim(), creadoPor: req.user?._id || req.body.creadoPor });
    await movimiento.save();
    return res.status(201).json({ message: "Comentario registrado", type: "Correcto" });
  } catch (error) {
    return res.status(500).json({ message: error.message, type: "Error" });
  }
};

module.exports = postComentarioMovimiento;
