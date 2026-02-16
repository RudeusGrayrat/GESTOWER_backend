const Destino = require("../../../../models/AllModulos/Certificacion/Destino");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
const escapeRegExp = require("../../../../utils/regex.js");

const getDestinoPagination = async (req, res) => {
    try {
        const { page = 0, limit = 10, search = "", tipoManejo = "", estado = "" } = req.query;
        const query = {};

        // Filtros específicos
        if (tipoManejo) {
            query.tipoManejo = tipoManejo;
        }
        if (estado) {
            query.estado = estado;
        }

        if (search) {
            const safeSearch = escapeRegExp(search);
            const regex = new RegExp(safeSearch, "i");

            // Buscar en ubigeos relacionados
            const ubigeos = await Ubigeo.find({
                $or: [
                    { departamento: regex },
                    { provincia: regex },
                    { distrito: regex }
                ]
            }).select("_id");
            const ubigeosIds = ubigeos.map(u => u._id);

            query.$or = [
                { razonSocial: regex },
                { ruc: !isNaN(search) ? parseInt(search) : regex },
                { codigoRegistroEors: regex },
                { correoElectronico: regex },
                { telefono: regex },
                { "representanteLegal.nombre": regex },
                { "representanteLegal.dni": regex },
                { "responsableTecnico.nombre": regex },
                { ubigeoId: { $in: ubigeosIds } }
            ];
        }

        const [data, total] = await Promise.all([
            Destino.find(query)
                .populate("ubigeoId")
                .skip(page * limit)
                .limit(parseInt(limit))
                .lean()
                .sort({ createdAt: -1 }),
            Destino.countDocuments(query),
        ]);

        return res.json({ data, total });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error al buscar destinos" });
    }
};

module.exports = getDestinoPagination;