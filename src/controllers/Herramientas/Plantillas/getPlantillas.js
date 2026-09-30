const PlantillasRH = require("../../../models/RecursosHumanos/PlantillasRH");

const getPlantillas = async (_req, res) => {
  try {
    const plantillas = await PlantillasRH.find().sort({ tipo: 1, createdAt: -1 });
    return res.status(200).json(plantillas);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = getPlantillas;
