const convertDocx = require("../../../utils/convertDocx");
const { prepararDatosManifiesto } = require("../../../utils/prepararDatosManifiesto");
const { publicPath, resolvePlantillaPath } = require("../../../utils/plantillasStorage");

// Comprueba el DOCX antes de activar o sustituir la plantilla existente.
const validar = async (file) => {
  await convertDocx(prepararDatosManifiesto({}), resolvePlantillaPath(publicPath(file.filename)));
};

module.exports = { validar };
