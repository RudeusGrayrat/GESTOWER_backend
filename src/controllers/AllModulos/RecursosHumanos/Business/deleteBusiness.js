const Business = require("../../../../models/RecursosHumanos/Business");
const { eliminarImagenEmpresa } = require("../../../../utils/empresaImagenes");

const deleteBusiness = async (req, res) => {
  const { _id } = req.body;
  try {
    const userDelete = await Business.findByIdAndDelete(_id);

    if (!userDelete) {
      return res.status(404).json({ message: "Empresa no encontrada" });
    }
    eliminarImagenEmpresa(userDelete.logo);
    eliminarImagenEmpresa(userDelete.representative?.signature);

    return res.status(200).json({
      message: "Empresa eliminada correctamente",
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = deleteBusiness;
