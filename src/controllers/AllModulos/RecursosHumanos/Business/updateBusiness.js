const Business = require("../../../../models/RecursosHumanos/Business");

const updateBusinessPartial = async (req, res) => {
  const { _id, ruc, razonSocial, domicilioFiscal, representative, logo } =
    req.body;

  try {
    const businessFound = await Business.findById(_id);

    if (!businessFound) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }

    if (ruc) businessFound.ruc = ruc;
    if (razonSocial) businessFound.razonSocial = razonSocial;
    if (domicilioFiscal) businessFound.domicilioFiscal = domicilioFiscal;
    if (representative){
      if (representative.name) businessFound.representative.name = representative.name;
      if (representative.documentType) businessFound.representative.documentType = representative.documentType;
      if (representative.documentNumber) businessFound.representative.documentNumber = representative.documentNumber;
      if (representative.signature) businessFound.representative.signature = representative.signature;
    }
    if (logo) businessFound.logo = logo;

    await businessFound.save();

    return res.status(200).json({
      message: "Empresa actualizada correctamente",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = updateBusinessPartial;
