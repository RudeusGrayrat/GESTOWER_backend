const Certificado = require("../../../../models/Certificacion/Certificados");

const getCertificados = async (req, res) => {
  try {
    const certificados = await Certificado.find();
    if (!certificados) {
      return res
        .status(404)
        .json({ message: "No se encontraron certificados" });
    }
    return res.status(200).json(certificados);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
module.exports = getCertificados;
