const PlantillasRH = require("../../../models/RecursosHumanos/PlantillasRH");
const { publicPath, removePlantillaFile } = require("../../../utils/plantillasStorage");

const patchPlantilla = async (req, res) => {
  try {
    const plantilla = await PlantillasRH.findById(req.params.id);
    if (!plantilla) return res.status(404).json({ message: "Plantilla no encontrada" });

    const { nombre, tipoContrato, state } = req.body;
    if (nombre) plantilla.nombre = nombre;
    if (plantilla.tipo === "CONTRATO" && tipoContrato) plantilla.tipoContrato = tipoContrato;
    if (state) {
      if (!["ACTIVO", "INACTIVO"].includes(state)) return res.status(400).json({ message: "Estado no válido" });
      if (plantilla.tipo === "BOLETA" && state === "ACTIVO") {
        await PlantillasRH.updateMany({ _id: { $ne: plantilla._id }, tipo: "BOLETA", state: "ACTIVO" }, { state: "INACTIVO" });
      }
      plantilla.state = state;
    }
    if (req.file) {
      const archivoAnterior = plantilla.archivo;
      plantilla.archivo = publicPath(req.file.filename);
      plantilla.archivoNombre = req.file.originalname;
      removePlantillaFile(archivoAnterior);
    }
    await plantilla.save();
    return res.status(200).json({ message: "Plantilla actualizada correctamente", data: plantilla });
  } catch (error) {
    if (req.file) removePlantillaFile(publicPath(req.file.filename));
    return res.status(500).json({ message: error.message });
  }
};

module.exports = patchPlantilla;
