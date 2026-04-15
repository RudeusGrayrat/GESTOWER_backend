const Business = require("../../../../models/Business");

const createBusiness = async (req, res) => {
  try {
    const { ruc, razonSocial, domicilioFiscal, logo, representative } =
      req.body;
    if (!ruc)
      return res.status(400).json({ message: "El campo ruc es obligatorio" });
    if (!razonSocial)
      res.status(400).json({ message: "El campo razon social es obligatorio" });
    if (!domicilioFiscal)
      return res
        .status(400)
        .json({ message: "El campo dirección es obligatorio" });
    if (!representative)
      return res
        .status(400)
        .json({ message: "El campo representante es obligatorio" });

    const findBusiness = await Business.findOne({ ruc });
    if (findBusiness)
      return res
        .status(400)
        .json({ message: "Ya existe una empresa con ese ruc" });

    const newBusiness = new Business({
      ruc,
      razonSocial,
      domicilioFiscal,
      representative,
      logo,
    });

    const savedBusiness = await newBusiness.save();
    return res
      .status(201)
      .json({ message: "Empresa creada correctamente", data: savedBusiness });
  } catch (error) {
    console.error("Error al crear empresa:", error);
    return res.status(500).json({ message: error.message });
  }
};

module.exports = createBusiness;
