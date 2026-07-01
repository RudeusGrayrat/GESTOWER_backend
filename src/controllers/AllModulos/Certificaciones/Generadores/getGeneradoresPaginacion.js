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

                if (transportistaDoc && transportistaDoc.generadores && transportistaDoc.generadores.length > 0) {
                    // Extraemos un arreglo puramente con los IDs de los generadores vinculados
                    const generadoresVinculadosIds = transportistaDoc.generadores.map(g => g.generadorId);

                    // Filtramos para que solo traiga los Generadores incluidos en esa lista
                    query._id = { $in: generadoresVinculadosIds };
                } else {
                    // Si el transportista no tiene ningún generador vinculado, 
                    // forzamos a que la consulta devuelva vacío inmediatamente (un ID que no existirá)
                    query._id = new mongoose.Types.ObjectId();
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