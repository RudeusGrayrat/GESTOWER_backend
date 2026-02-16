const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Planta = require("../../../../models/AllModulos/Certificacion/Plantas");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
const escapeRegExp = require("../../../../utils/regex.js");

const getPlantaPagination = async (req, res) => {
    try {
        const { page = 0, limit = 10, search = "", generadorId = "", estado = "" } = req.query;
        const query = {};

        if (generadorId) {
            query.generadorId = generadorId;
        }
        if (estado) {
            query.estado = estado;
        }

        if (search) {
            const safeSearch = escapeRegExp(search);
            const regex = new RegExp(safeSearch, "i");

            // Buscar en generadores y ubigeos relacionados
            const [generadores, ubigeos] = await Promise.all([
                Generador.find({ razonSocial: regex }).select("_id"),
                Ubigeo.find({
                    $or: [
                        { departamento: regex },
                        { provincia: regex },
                        { distrito: regex }
                    ]
                }).select("_id")
            ]);

            const generadoresIds = generadores.map(g => g._id);
            const ubigeosIds = ubigeos.map(u => u._id);

            query.$or = [
                { denominacion: regex },
                { direccion: regex },
                { actividadEconomica: regex },
                { sector: regex },
                { "responsableGestion.nombre": regex },
                { "responsableGestion.cargo": regex },
                { "responsableGestion.dni": regex },
                { "responsableGestion.correo": regex },
                { numeroResolucionIga: regex },
                { generadorId: { $in: generadoresIds } },
                { ubigeoId: { $in: ubigeosIds } }
            ];
        }

        const [data, total] = await Promise.all([
            Planta.find(query)
                .populate("generadorId")
                .populate("ubigeoId")
                .skip(page * limit)
                .limit(parseInt(limit))
                .lean()
                .sort({ createdAt: -1 }),
            Planta.countDocuments(query),
        ]);

        return res.json({ data, total });
    } catch (error) {
        return res.status(500).json({ message: error.message || "Error al buscar plantas" });
    }
};

module.exports = getPlantaPagination;