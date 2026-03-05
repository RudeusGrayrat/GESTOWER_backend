const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
const escapeRegExp = require("../../../../utils/regex/regex.js");

const getUbigeoPagination = async (req, res) => {
    try {
        const { page = 0, limit = 10, search = "", departamento = "", provincia = "", distrito = "", estado = "" } = req.query;
        const query = {};

        // Filtros específicos
        if (departamento) {
            query.departamento = new RegExp(escapeRegExp(departamento), "i");
        }
        if (provincia) {
            query.provincia = new RegExp(escapeRegExp(provincia), "i");
        }
        if (distrito) {
            query.distrito = new RegExp(escapeRegExp(distrito), "i");
        }
        if (estado) {
            query.estado = estado;
        }

        if (search) {
            const safeSearch = escapeRegExp(search);
            const regex = new RegExp(safeSearch, "i");

            query.$or = [
                { codigo: regex },
                { departamento: regex },
                { provincia: regex },
                { distrito: regex },
            ];
        }

        const [data, total] = await Promise.all([
            Ubigeo.find(query)
                .skip(page * limit)
                .limit(parseInt(limit))
                .lean()
                .sort({ departamento: 1, provincia: 1, distrito: 1 }),
            Ubigeo.countDocuments(query),
        ]);

        return res.json({ data, total });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error al buscar ubigeos" });
    }
};

module.exports = getUbigeoPagination;