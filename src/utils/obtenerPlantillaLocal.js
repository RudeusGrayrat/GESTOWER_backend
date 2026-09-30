const PlantillasRH = require("../models/RecursosHumanos/PlantillasRH");
const { resolvePlantillaPath } = require("./plantillasStorage");

const obtenerPlantillaLocal = async (filtro) => {
  const plantilla = await PlantillasRH.findOne({ ...filtro, state: "ACTIVO" }).sort({ updatedAt: -1 });
  if (!plantilla) return null;

  const ruta = resolvePlantillaPath(plantilla.archivo);
  return ruta ? { plantilla, ruta } : null;
};

module.exports = obtenerPlantillaLocal;
