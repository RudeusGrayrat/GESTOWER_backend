const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const escapeRegExp = require("../../../../utils/regex/regex.js");


const getGeneradorPagination = async (req, res) => {
    try {
        const { page = 0, limit = 10, search = "", estado = "" } = req.query;
        const query = {};

        if (estado) {
            query.estado = estado;
        }

        if (search) {
            const safeSearch = escapeRegExp(search);
            const regex = new RegExp(safeSearch, "i");

            query.$or = [
                { razonSocial: regex },
                { correoElectronico: regex },
                { direccion: regex },
                { telefono: regex },
                { representanteLegal: regex },
                { dniRepresentante: regex },
            ];
            if (!isNaN(search) && search.trim() !== "") {
                query.$or.push({ ruc: search.trim() });
            }
        }

        const [data, total] = await Promise.all([
            Generador.find(query)
                .skip(page * limit)
                .limit(parseInt(limit))
                .lean()
                .sort({ createdAt: -1 }),
            Generador.countDocuments(query),
        ]);

        return res.json({ data, total });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error al buscar generadores" });
    }
};

module.exports = getGeneradorPagination;