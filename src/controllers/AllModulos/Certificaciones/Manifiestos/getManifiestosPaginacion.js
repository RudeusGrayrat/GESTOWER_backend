const Destino = require("../../../../models/AllModulos/Certificacion/Destino");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const escapeRegExp = require("../../../../utils/regex/regex.js");


const getManifiestoPagination = async (req, res) => {
    try {
        const {
            page = 0,
            limit = 10,
            search = "",
            año = "",
            mes = "",
            estado = "",
            usuario = ""
        } = req.query;
        const query = {};
        const andConditions = [];

        // Filtros específicos
        if (año) query.año = parseInt(año);
        if (mes) query.mes = parseInt(mes);
        if (estado) query.estado = estado;

        if (usuario) {
            andConditions.push({
                $or: [
                    { creadoPor: usuario },
                    { modificadoPor: usuario },
                    { generadorId: usuario },
                    { transportistaId: usuario },
                ],
            });
        }
        
        if (search) {
            const safeSearch = escapeRegExp(search);
            const regex = new RegExp(safeSearch, "i");

            // Buscar en entidades relacionadas
            const [generadores, plantas, transportistas, destinos] = await Promise.all([
                Generador.find({ razonSocial: regex }).select("_id"),
                // Planta.find({ denominacion: regex }).select("_id"),
                Transportista.find({ razonSocial: regex }).select("_id"),
                Destino.find({ razonSocial: regex }).select("_id")
            ]);

            const generadoresIds = generadores?.map(g => g._id);
            const plantasIds = plantas?.map(p => p._id);
            const transportistasIds = transportistas?.map(t => t._id);
            const destinosIds = destinos?.map(d => d._id);

            andConditions.push({
                $or: [
                    { numeroManifiesto: regex },
                    { "residuo.descripcion": regex },
                    { "transporte.nombreConductor": regex },
                    { "transporte.placaVehiculo": regex },
                    { generadorId: { $in: generadoresIds } },
                    { plantaId: { $in: plantasIds } },
                    { transportistaId: { $in: transportistasIds } },
                    { destinoId: { $in: destinosIds } },
                    {
                        $expr: {
                            $regexMatch: {
                                input: { $toString: "$año" },
                                regex: safeSearch,
                                options: "i",
                            },
                        },
                    },
                ],
            });
        }

        if (andConditions.length) query.$and = andConditions;

        const [data, total] = await Promise.all([
            Manifiesto.find(query)
                .populate({ path: "generadorId", populate: { path: "plantas", populate: "ubigeoId" } })
                .populate({ path: "transportistaId", populate: { path: "ubigeoId" } })
                .populate({ path: "planta", populate: { path: "ubigeoId" } })
                .populate({ path: "destinoId", populate: { path: "ubigeoId" } })
                .populate("creadoPor", "name lastname")
                .populate("modificadoPor", "name lastname")
                .skip(page * limit)
                .limit(parseInt(limit))
                .lean()
                .sort({ año: -1, mes: -1, createdAt: -1 }),
            Manifiesto.countDocuments(query),
        ]);

        return res.json({ data, total });
    } catch (error) {
        console.error("Error al buscar manifiestos:", error);
        return res.status(500).json({ message: error.message || "Error al buscar manifiestos" });
    }
};

module.exports = getManifiestoPagination;