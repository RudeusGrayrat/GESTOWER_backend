const PlantillasRH = require("../../../models/RecursosHumanos/PlantillasRH");
const { publicPath, removePlantillaFile } = require("../../../utils/plantillasStorage");

const postPlantilla = async (req, res) => {
  try {
    const { nombre, tipo, tipoContrato, state = "ACTIVO" } = req.body;
    if (!nombre || !tipo || !req.file) {
      return res.status(400).json({ message: "Nombre, tipo y archivo son obligatorios" });
    }
    if (!["CONTRATO", "BOLETA"].includes(tipo) || !["ACTIVO", "INACTIVO"].includes(state)) {
      return res.status(400).json({ message: "Datos de plantilla no válidos" });
    }
    if (tipo === "CONTRATO" && !tipoContrato) {
      return res.status(400).json({ message: "El tipo de contrato es obligatorio" });
    }

    // Una boleta se genera siempre desde una única plantilla global activa.
    if (tipo === "BOLETA" && state === "ACTIVO") {
      await PlantillasRH.updateMany({ tipo: "BOLETA", state: "ACTIVO" }, { state: "INACTIVO" });
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
