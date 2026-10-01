const Business = require("../../../../models/RecursosHumanos/Business");
const { guardarImagenEmpresa, eliminarImagenEmpresa } = require("../../../../utils/empresaImagenes");

const updateBusinessPartial = async (req, res) => {
  const { _id, ruc, razonSocial, domicilioFiscal, representative, logo } = req.body;

  try {
    const businessFound = await Business.findById(_id);

    if (!businessFound) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    if (ruc) businessFound.ruc = ruc;
    if (razonSocial) businessFound.razonSocial = razonSocial;
    if (domicilioFiscal) businessFound.domicilioFiscal = domicilioFiscal;
    const imagenesNuevas = [];
    const imagenesAnteriores = [];
    if (representative) {
      if (representative.name) businessFound.representative.name = representative.name;
      if (representative.documentType) businessFound.representative.documentType = representative.documentType;
      if (representative.documentNumber) businessFound.representative.documentNumber = representative.documentNumber;
      if (Object.prototype.hasOwnProperty.call(representative, "signature")) {
        const firmaGuardada = guardarImagenEmpresa(representative.signature, "firma");
        if (firmaGuardada !== businessFound.representative.signature) {
          if (firmaGuardada !== representative.signature) imagenesNuevas.push(firmaGuardada);
          imagenesAnteriores.push(businessFound.representative.signature);
          businessFound.representative.signature = firmaGuardada;
        }
      }
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "logo")) {
      const logoGuardado = guardarImagenEmpresa(logo, "logo");
      if (logoGuardado !== businessFound.logo) {
        if (logoGuardado !== logo) imagenesNuevas.push(logoGuardado);
        imagenesAnteriores.push(businessFound.logo);
        businessFound.logo = logoGuardado;
      }
    }

    try {
      await businessFound.save();
    } catch (error) {
      imagenesNuevas.forEach(eliminarImagenEmpresa);
      throw error;
    }
    imagenesAnteriores.forEach(eliminarImagenEmpresa);

    return res.status(200).json({
      message: "Empresa actualizada correctamente",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = updateBusinessPartial;
