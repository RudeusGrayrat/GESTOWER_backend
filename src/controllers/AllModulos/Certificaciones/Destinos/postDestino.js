const Destino = require("../../../../models/AllModulos/Certificacion/Destino");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");


const postDestino = async (req, res) => {
    try {
        const {
            razonSocial,
            ruc,
            codigoRegistroEors,
            autorizacionMunicipal,
            tipoManejo,
            direccion,
            ubigeoId,
            correoElectronico,
            telefono,
            representanteLegal,
            responsableTecnico,
            estado
        } = req.body;

        // Validaciones de campos requeridos
        if (!razonSocial || !ruc || !codigoRegistroEors || !tipoManejo || !direccion || !ubigeoId || !correoElectronico || !telefono || !representanteLegal?.nombre || !representanteLegal?.dni) {
            return res.status(400).json({
                message: "Faltan datos requeridos para crear el destino",
                type: "Error"
            });
        }

        // Verificar si ya existe un destino con el mismo RUC
        const findDestino = await Destino.findOne({ ruc });
        if (findDestino) {
            return res.status(400).json({
                message: "El destino con este RUC ya existe",
                type: "Error"
            });
        }

        // Verificar que el ubigeo exista
        const findUbigeo = await Ubigeo.findById(ubigeoId);
        if (!findUbigeo) {
            return res.status(404).json({
                message: "Ubigeo no encontrado",
                type: "Error"
            });
        }

        const newDestino = new Destino({
            razonSocial,
            ruc,
            codigoRegistroEors,
            autorizacionMunicipal,
            tipoManejo,
            direccion,
            ubigeoId,
            correoElectronico,
            telefono,
            representanteLegal,
            responsableTecnico: responsableTecnico || {},
            estado: estado || "ACTIVO",
        });

        await newDestino.save();
        return res.status(201).json({
            message: "Destino creado exitosamente",
            data: newDestino,
            type: "Correcto"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Error al crear el destino",
            type: "Error"
        });
    }
};

module.exports = postDestino;