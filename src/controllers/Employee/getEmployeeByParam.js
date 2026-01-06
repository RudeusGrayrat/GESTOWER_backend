const Employee = require("../../models/Employees/Employee");

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
const getEmployeeByParams = async (req, res) => {
  try {
    const { page = 0, limit = 10, search = "" } = req.query;
    const query = {};

    if (search) {
      const safeSearch = escapeRegExp(search);
      const regex = new RegExp(safeSearch, "i");
      const colaboradores = await Employee.find({
        $or: [
          { name: regex },
          { lastname: regex },
          { business: regex },
          { charge: regex },
        ],
      }).select("_id");

      const colaboradoresIds = colaboradores.map((c) => c._id);
      query.$or = [{ _id: { $in: colaboradoresIds } }, { state: regex }];
    }
    const [data, total] = await Promise.all([
      Employee.find(query)
        .skip(page * limit)
        .limit(parseInt(limit))
        .lean()
        .sort({ createdAt: -1 }),
      Employee.countDocuments(query),
    ]);

    return res.json({ data, total });
  } catch (err) {
    return res
      .status(500)
      .json({ message: err.message || "Error al buscar Colaboradores" });
  }
};

module.exports = getEmployeeByParams;
