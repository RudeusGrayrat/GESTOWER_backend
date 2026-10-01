const Business = require("../../../../models/RecursosHumanos/Business");

const getBusinessById = async (req, res) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ message: "Empresa no encontrada" });
    return res.json(business);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Error al obtener empresa" });
  }
};

module.exports = getBusinessById;
