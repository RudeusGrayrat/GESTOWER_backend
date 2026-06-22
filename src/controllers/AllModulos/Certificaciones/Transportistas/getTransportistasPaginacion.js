const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
// 1. 🌟 Importamos el modelo de usuarios para resolver el generadorId
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const escapeRegExp = require("../../../../utils/regex/regex.js");
const mongoose = require("mongoose");

const getTransportistaPagination = async (req, res) => {
    try {
        // 2. 🌟 Recibimos 'usuario' desde los query params (req.query)
        const { page = 0, limit = 10, search = "", estado = "", usuario = "" } = req.query;
        const query = {};

        // Filtro por estado básico
        if (estado) {
            query.estado = estado;
        }

        // 3. 🌟 LÓGICA DE VINCULACIÓN GENERADOR -> TRANSPORTISTA
        if (usuario && mongoose.Types.ObjectId.isValid(usuario)) {
            const cuentaUsuario = await UserExternal.findById(usuario);

            // Si el usuario existe y efectivamente tiene un rol de GENERADOR vinculado
            if (cuentaUsuario && cuentaUsuario.generadorId) {
                // Filtramos para que solo traiga transportistas donde este generadorId esté en su lista
                query["generadores.generadorId"] = cuentaUsuario.generadorId;
            }
        }

        // Filtro por barra de búsqueda (Search)
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

        // Ejecución de la consulta con paginación y poblaciones
        const [data, total] = await Promise.all([
            Transportista.find(query)
                .skip(page * limit)
                .limit(parseInt(limit))
                .populate("ubigeoId")
                .populate("generadores.generadorId") // 🌟 Recomendación: puebla los datos del generador si necesitas mostrarlos
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