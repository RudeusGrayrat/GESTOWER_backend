const Submodule = require("../../../../models/SubModule");

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const getSubmodulosPagination = async (req, res) => {
    try {
        const { limit = 10, page = 0, search = "" } = req.query;
        const query = {};

        if (search) {
            const safeSearch = escapeRegExp(search);
            const regex = new RegExp(safeSearch, "i");

            // Buscar coincidencias por
            query.$or = [
                { name: regex },
                { module: regex }
            ];
        }

        const [data, total] = await Promise.all([
            Submodule.find(query)
                .skip(page * limit)
                .limit(parseInt(limit))
                .sort({ _id: -1 })
                .lean(),
            Submodule.countDocuments(query),
        ]);
        return res.json({ data, total });
    } catch (error) {
        return res
            .status(500)
            .json({ message: error.message || "Error al buscar Submódulos" });
    }
};

module.exports = getSubmodulosPagination;