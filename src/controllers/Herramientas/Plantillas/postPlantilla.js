const PlantillasRH = require("../../../models/RecursosHumanos/PlantillasRH");
const { publicPath, removePlantillaFile } = require("../../../utils/plantillasStorage");
const validarManifiesto = require("./validarPlantillaManifiesto");

const postPlantilla = async (req, res) => {
  try {
    const { nombre, tipo, tipoContrato, state = "ACTIVO" } = req.body;
    if (!nombre || !tipo || !req.file) {
      if (req.file) removePlantillaFile(publicPath(req.file.filename));
      return res.status(400).json({ message: "Nombre, tipo y archivo son obligatorios" });
    }
    if (!["CONTRATO", "BOLETA", "MANIFIESTO"].includes(tipo) || !["ACTIVO", "INACTIVO"].includes(state)) {
      removePlantillaFile(publicPath(req.file.filename));
      return res.status(400).json({ message: "Datos de plantilla no válidos" });
    }
    if (tipo === "CONTRATO" && !tipoContrato) {
      removePlantillaFile(publicPath(req.file.filename));
      return res.status(400).json({ message: "El tipo de contrato es obligatorio" });
    }

    if (tipo === "MANIFIESTO") {
      try { await validarManifiesto.validar(req.file); }
      catch (_error) {
        removePlantillaFile(publicPath(req.file.filename));
        return res.status(400).json({ message: "No se pudo procesar la plantilla de manifiesto. Revisa que sea un DOCX válido y que sus variables de imagen sean correctas." });
      }
    }

    // Boletas y manifiestos utilizan una única plantilla global activa por tipo.
    if (["BOLETA", "MANIFIESTO"].includes(tipo) && state === "ACTIVO") {
      await PlantillasRH.updateMany({ tipo, state: "ACTIVO" }, { state: "INACTIVO" });
    }

    const plantilla = await PlantillasRH.create({
      nombre,
      tipo,
      tipoContrato: tipo === "CONTRATO" ? tipoContrato : undefined,
      state,
      archivo: publicPath(req.file.filename),
      archivoNombre: req.file.originalname,
    });
    return res.status(201).json({ message: "Plantilla creada correctamente", data: plantilla });
  } catch (error) {
    if (req.file) removePlantillaFile(publicPath(req.file.filename));
    return res.status(500).json({ message: error.message });
  }
};

module.exports = postPlantilla;
