const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");

const postTransportista = async (req, res) => {
    try {
        const {
            razonSocial,
            ruc,
            registroEors,
            autorizacionMunicipal,
            documentoRuta,
            direccion,
            ubigeoId,
            correoElectronico,
            telefono,
            responsableTecnico,
            contingencias,
            generadores,
            conductores,
            estado
        } = req.body;

        if (!razonSocial || !ruc || !registroEors || !direccion || !ubigeoId || !correoElectronico || !telefono) {
            return res.status(400).json({
                message: "Faltan datos requeridos para crear el transportista",
                type: "Error"
            });
        }

        const findTransportista = await Transportista.findOne({ ruc });
        if (findTransportista) {
            return res.status(400).json({
                message: "El transportista con este RUC ya existe",
                type: "Error"
            });
        }

        const findUbigeo = await Ubigeo.findById(ubigeoId);
        if (!findUbigeo) {
            return res.status(404).json({
                message: "Ubigeo no encontrado",
            });
        }

        const newTransportista = new Transportista({
            razonSocial,
            ruc,
            registroEors,
            autorizacionMunicipal,
            documentoRuta,
            direccion,
            ubigeoId,
            correoElectronico,
            telefono,
            responsableTecnico: responsableTecnico || [],
            contingencias: contingencias || {},
            generadores: generadores || [],
            conductores: conductores || [],
            estado: estado || "ACTIVO",
        });

        await newTransportista.save();
        return res.status(201).json({
            message: "Transportista creado exitosamente",
            data: newTransportista,
            type: "Correcto"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Error al crear el transportista",
            type: "Error"
        });
    }
};

module.exports = postTransportista;