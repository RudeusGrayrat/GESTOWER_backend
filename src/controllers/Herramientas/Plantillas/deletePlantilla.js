const PlantillasRH = require("../../../models/RecursosHumanos/PlantillasRH");
const { removePlantillaFile } = require("../../../utils/plantillasStorage");

const deletePlantilla = async (req, res) => {
  try {
    const plantilla = await PlantillasRH.findByIdAndDelete(req.params.id);
    if (!plantilla) return res.status(404).json({ message: "Plantilla no encontrada" });
    removePlantillaFile(plantilla.archivo);
    return res.status(200).json({ message: "Plantilla eliminada correctamente" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = deletePlantilla;
