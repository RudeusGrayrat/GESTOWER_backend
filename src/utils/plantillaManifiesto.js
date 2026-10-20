const fs = require("fs");
const obtenerPlantillaLocal = require("./obtenerPlantillaLocal");

const plantillaManifiesto = async () => {
  const activa = await obtenerPlantillaLocal({ tipo: "MANIFIESTO" });
  if (!activa) {
    throw new Error("No hay una plantilla de manifiesto activa configurada.");
  }
  if (!fs.existsSync(activa.ruta)) {
    throw new Error("El archivo de la plantilla activa de manifiesto no existe en el servidor.");
  }
  return activa.ruta;
};

module.exports = plantillaManifiesto;
