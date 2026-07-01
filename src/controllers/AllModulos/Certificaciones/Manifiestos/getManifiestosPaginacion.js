const Destino = require("../../../../models/AllModulos/Certificacion/Destino");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const UserExternal = require("../../../../models/ManifesTower/UserExternal.js");
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
            usuario = "",
            rolActivo = "" // Recibimos el rol desde el Frontend ("GENERADOR" o "TRANSPORTISTA")
        } = req.query;

        const query = {};
        const andConditions = [];

        // Filtros específicos de fecha y estado
        if (año) query.año = parseInt(año);
        if (mes) query.mes = parseInt(mes);
        if (estado) query.estado = estado;

        // Búsqueda previa del usuario externo para identificar sus empresas vinculadas
        if (usuario) {
            console.log("Usuario recibido:", usuario, "Rol activo:", rolActivo);
            const findUser = await UserExternal.findById(usuario).lean();
            console.log("Usuario encontrado:", findUser);
            if (!findUser) {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }

            if (rolActivo === "GENERADOR") {
                // Si el usuario no tiene una empresa asignada, devolvemos un arreglo vacío de forma segura
                if (!findUser.generadorId) {
                    return res.json({ data: [], total: 0 });
                }
                console.log("Generador ID del usuario:", findUser.generadorId);

                andConditions.push({
                    generadorId: findUser.generadorId,
                    //estado: { $ne: "BORRADOR" } // Opcional: El generador solo ve lo aprobado o en revisión, no borradores del transportista
                });
            }
            else if (rolActivo === "TRANSPORTISTA") {
                if (!findUser.transportistaId) {
                    return res.json({ data: [], total: 0 });
                }

                andConditions.push({
                    transportistaId: findUser.transportistaId
                });
            }
            else {
                // Vista general / Administradores / ERP Interno
                // Construimos el $or dinámicamente para evitar pasar valores "undefined" o "null" a la consulta
                const orConditions = [
                    { creadoPor: findUser._id },
                    { modificadoPor: findUser._id }
                ];

                if (findUser.generadorId) orConditions.push({ generadorId: findUser.generadorId });
                if (findUser.transportistaId) orConditions.push({ transportistaId: findUser.transportistaId });

                andConditions.push({ $or: orConditions });
            }
        }

        // Lógica de búsqueda por texto (Corregida)
        if (search) {
            const safeSearch = escapeRegExp(search);
            const regex = new RegExp(safeSearch, "i");

            const [generadores, transportistas, destinos] = await Promise.all([
                Generador.find({ razonSocial: regex }).select("_id"),
                Transportista.find({ razonSocial: regex }).select("_id"),
                Destino.find({ razonSocial: regex }).select("_id")
            ]);

            const generadoresIds = generadores?.map(g => g._id) || [];
            const transportistasIds = transportistas?.map(t => t._id) || [];
            const destinosIds = destinos?.map(d => d._id) || [];

            andConditions.push({
                $or: [
                    { numeroManifiesto: regex },
                    { "residuo.descripcion": regex },
                    { "transporte.nombreConductor": regex },
                    { "transporte.placaVehiculo": regex },
                    { "planta.denominacion": regex },
                    { generadorId: { $in: generadoresIds } },
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

        // Ejecución y paginación en la Base de Datos
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
                .sort({ createdAt: -1 }),
            Manifiesto.countDocuments(query),
        ]);

        return res.json({ data, total });

    } catch (error) {
        console.error("Error al buscar manifiestos:", error);
        return res.status(500).json({ message: error.message || "Error al buscar manifiestos" });
    }
};

module.exports = getManifiestoPagination;