const Contract = require("../../models/Contracts");

const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Fetching contract for collaborator ID:", id);
    const contract = await Contract.findOne({ colaborador: id });
    console.log("Contract found:", contract);
    if (!contract) {
      return res.status(404).json({ message: "Contrato no encontrado" });
    }

    return res.status(200).json(contract);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = getContractById;
