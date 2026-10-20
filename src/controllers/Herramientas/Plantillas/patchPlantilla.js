const PlantillasRH = require("../../../models/RecursosHumanos/PlantillasRH");
const { publicPath, removePlantillaFile } = require("../../../utils/plantillasStorage");
const validarManifiesto = require("./validarPlantillaManifiesto");

const patchPlantilla = async (req, res) => {
  try {
    const plantilla = await PlantillasRH.findById(req.params.id);
    if (!plantilla) {
      if (req.file) removePlantillaFile(publicPath(req.file.filename));
      return res.status(404).json({ message: "Plantilla no encontrada" });
    }

    if (plantilla.tipo === "MANIFIESTO" && req.file) {
      try { await validarManifiesto.validar(req.file); }
      catch (_error) {
        removePlantillaFile(publicPath(req.file.filename));
        return res.status(400).json({ message: "No se pudo procesar la plantilla de manifiesto. Revisa que sea un DOCX válido y que sus variables de imagen sean correctas." });
      }
    }

    const { nombre, tipoContrato, state } = req.body;
    if (nombre) plantilla.nombre = nombre;
    if (plantilla.tipo === "CONTRATO" && tipoContrato) plantilla.tipoContrato = tipoContrato;
    if (state) {
      if (!["ACTIVO", "INACTIVO"].includes(state)) {
        if (req.file) removePlantillaFile(publicPath(req.file.filename));
        return res.status(400).json({ message: "Estado no válido" });
      }
      if (["BOLETA", "MANIFIESTO"].includes(plantilla.tipo) && state === "ACTIVO") {
        await PlantillasRH.updateMany({ _id: { $ne: plantilla._id }, tipo: plantilla.tipo, state: "ACTIVO" }, { state: "INACTIVO" });
      }
      plantilla.state = state;
    }
    let archivoAnterior;
    if (req.file) {
      archivoAnterior = plantilla.archivo;
      plantilla.archivo = publicPath(req.file.filename);
      plantilla.archivoNombre = req.file.originalname;
    }
    await plantilla.save();
    if (archivoAnterior) {
      try { removePlantillaFile(archivoAnterior); }
      catch (error) { console.warn("No se pudo eliminar la plantilla anterior:", error.message); }
    }
    return res.status(200).json({ message: "Plantilla actualizada correctamente", data: plantilla });
  } catch (error) {
    if (req.file) removePlantillaFile(publicPath(req.file.filename));
    return res.status(500).json({ message: error.message });
  }
};

module.exports = patchPlantilla;
