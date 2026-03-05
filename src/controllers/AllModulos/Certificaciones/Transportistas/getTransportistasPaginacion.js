const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
const escapeRegExp = require("../../../../utils/regex/regex.js");


const getTransportistaPagination = async (req, res) => {
    try {
        const { page = 0, limit = 10, search = "", estado = "" } = req.query;
        const query = {};

        if (estado) {
            query.estado = estado;
        }

        if (search) {
            const safeSearch = escapeRegExp(search);
            const regex = new RegExp(safeSearch, "i");

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
                { registroEors: regex },
                { autorizacionMunicipal: regex },
                { documentoRuta: regex },
                { direccion: regex },
                { correoElectronico: regex },
                { telefono: regex },
                { "representanteLegal.nombre": regex },
                { "representanteLegal.dni": regex },
                { "responsableTecnico.nombre": regex },
                { "responsableTecnico.numeroColegiatura": regex },
                { ubigeoId: { $in: ubigeosIds } }
            ];
            if (!isNaN(search) && search.trim() !== '') {
                query.$or.push({ ruc: parseInt(search) });
            }
        }

        const [data, total] = await Promise.all([
            Transportista.find(query)
                .skip(page * limit)
                .limit(parseInt(limit))
                .populate("ubigeoId")
                .lean()
                .sort({ createdAt: -1 }),
            Transportista.countDocuments(query),
        ]);

        return res.json({ data, total });
    } catch (error) {
        console.error("Error fetching transportistas with pagination:", error);
        return res.status(500).json({ message: error.message || "Error al buscar transportistas" });
    }
};

module.exports = getTransportistaPagination;