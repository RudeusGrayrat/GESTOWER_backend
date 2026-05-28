const Business = require("../../../../models/RecursosHumanos/Business");


const getBusiness = async (req, res) => {
  try {
    const rolesFound = await Business.find();
    if (!rolesFound)
      return res.status(400).json({ message: "Business not found" });
    return res.status(201).json(rolesFound);
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
module.exports = getBusiness;
