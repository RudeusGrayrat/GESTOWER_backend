const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas.js");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const escapeRegExp = require("../../../../utils/regex/regex.js");
const mongoose = require("mongoose");

const getTransportistaPagination = async (req, res) => {
    try {
        const { page = 0, limit = 10, search = "", estado = "", usuario = "" } = req.query;
        const query = {};

        if (estado) {
            query.estado = estado;
        }

        let cuentaUsuario = null;
        if (usuario && mongoose.Types.ObjectId.isValid(usuario)) {
            cuentaUsuario = await UserExternal.findById(usuario);

            if (cuentaUsuario && cuentaUsuario.generadorId) {
                query["generadores.generadorId"] = cuentaUsuario.generadorId;
            }
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
        }

        const skipRows = parseInt(page) * parseInt(limit);
        const total = await Transportista.countDocuments(query);
        const transportistas = await Transportista.find(query)
            .skip(skipRows)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        // Aplanamos de manera inteligente el permiso de llenado exclusivo para este Generador antes de responder
        const dataMapped = transportistas.map(t => {
            const tObj = t.toObject();
            if (cuentaUsuario && cuentaUsuario.generadorId) {
                const relacion = tObj.generadores?.find(g =>
                    g.generadorId.toString() === cuentaUsuario.generadorId.toString()
                );
                tObj.tienePermisoLlenado = relacion ? relacion.tienePermisoLlenado : false;
            } else {
                tObj.tienePermisoLlenado = false;
            }
            return tObj;
        });

        return res.status(200).json({
            success: true,
            data: dataMapped,
            total: total
        });

    } catch (error) {
        console.error("Error en getTransportistaPagination:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};

module.exports = getTransportistaPagination