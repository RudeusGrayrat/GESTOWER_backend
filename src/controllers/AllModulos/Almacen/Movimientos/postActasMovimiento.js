const Movimiento = require("../../../../models/AllModulos/Almacen/Movimiento");

const postActasMovimiento = async (req, res) => {
  try {
    const movimiento = await Movimiento.findById(req.params.movimientoId);
    if (!movimiento) return res.status(404).json({ message: "Movimiento no encontrado", type: "Error" });
    if (!req.files?.length) return res.status(400).json({ message: "Debe adjuntar al menos un acta", type: "Error" });

    const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const actas = req.files.map((file) => ({
      nombre: file.originalname,
      mimeType: file.mimetype,
      url: `${baseUrl}/api/uploads/actas-movimientos/${file.filename}`,
      subidoPor: req.user?._id || req.body.subidoPor,
    }));

    movimiento.actasEscaneadas.push(...actas);
    await movimiento.save();
    return res.status(201).json({ message: "Acta(s) escaneada(s) adjuntada(s)", data: actas, type: "Correcto" });
  } catch (error) {
    return res.status(500).json({ message: error.message, type: "Error" });
  }
};

module.exports = postActasMovimiento;
