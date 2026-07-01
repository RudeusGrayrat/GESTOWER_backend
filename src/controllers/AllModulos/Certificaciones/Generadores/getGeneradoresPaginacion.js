const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas.js");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const escapeRegExp = require("../../../../utils/regex/regex.js");
const mongoose = require("mongoose");

const getGeneradorPagination = async (req, res) => {
    try {
        const { page = 0, limit = 10, search = "", estado = "", usuario = "" } = req.query;
        const query = {};

        if (estado) {
            query.estado = estado;
        }

        if (usuario && mongoose.Types.ObjectId.isValid(usuario)) {
            const cuentaUsuario = await UserExternal.findById(usuario);

            // Si el usuario existe y está navegando con su perfil de TRANSPORTISTA
            if (cuentaUsuario && cuentaUsuario.transportistaId) {

                // Buscamos el documento del transportista y solo traemos el campo 'generadores'
                const transportistaDoc = await Transportista.findById(cuentaUsuario.transportistaId)
                    .select("generadores")
                    .lean();

                // 1. Validamos que exista el documento y el array de generadores
                if (transportistaDoc && transportistaDoc.generadores) {

                    // 2. Mapeamos defensivamente con Optional Chaining y filtramos nulos/undefined
                    const generadoresVinculadosIds = transportistaDoc.generadores
                        .map(g => g?.generadorId)
                        .filter(Boolean); // Limpia cualquier null/undefined que rompa el flujo

                    // 3. Verificamos si realmente nos quedaron IDs válidos para consultar
                    if (generadoresVinculadosIds.length > 0) {
                        // Si hay IDs limpios, filtramos por ellos
                        query._id = { $in: generadoresVinculadosIds };
                    } else {
                        // Si el array estaba vacío de origen, o todos sus elementos eran null,
                        // forzamos a que la consulta devuelva vacío de forma segura.
                        query._id = null
                    }
                } else {
                    // Por si el documento del transportista ni siquiera tiene la propiedad 'generadores'
                    query._id = null;
                }
            }
        }

        // Filtro por barra de búsqueda (Search)
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

        // Ejecución de la consulta con paginación
        const [data, total] = await Promise.all([
            Generador.find(query)
                .skip(page * limit)
                .limit(parseInt(limit))
                .populate("plantas.ubigeoId", "departamento provincia distrito codigo")
                .lean()
                .sort({ createdAt: -1 }),
            Generador.countDocuments(query),
        ]);

        return res.json({ data, total });
    } catch (error) {
        console.error("Error fetching generadores with pagination:", error);
        return res.status(500).json({ message: error.message || "Error al buscar generadores" });
    }
};

module.exports = getGeneradorPagination;