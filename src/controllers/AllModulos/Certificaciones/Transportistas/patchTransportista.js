const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");

const patchTransportista = async (req, res) => {
    const { transportistaId } = req.params;
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
        representanteLegal,
        responsableTecnico,
        contingencias,
        generadores,
        conductores,
        estado
    } = req.body;
    try {

        const findTransportista = await Transportista.findById(transportistaId);
        if (!findTransportista) {
            return res.status(404).json({
                message: "Transportista no encontrado",
                type: "Error"
            });
        }
        if (ubigeoId) {
            const findUbigeo = await Ubigeo.findById(ubigeoId);
            if (!findUbigeo) {
                return res.status(404).json({
                    message: "Ubigeo no encontrado",
                    type: "Error"
                });
            }
            findTransportista.ubigeoId = ubigeoId;
        }
        if (ruc) findTransportista.ruc = ruc;
        if (razonSocial) findTransportista.razonSocial = razonSocial;
        if (registroEors) findTransportista.registroEors = registroEors;
        if (autorizacionMunicipal) findTransportista.autorizacionMunicipal = autorizacionMunicipal;
        if (documentoRuta) findTransportista.documentoRuta = documentoRuta;
        if (direccion) findTransportista.direccion = direccion;
        if (correoElectronico) findTransportista.correoElectronico = correoElectronico;
        if (telefono) findTransportista.telefono = telefono;
        if (representanteLegal) {
            findTransportista.representanteLegal = {
                ...findTransportista.representanteLegal,
                ...representanteLegal
            };
        }
        if (responsableTecnico) {
            findTransportista.responsableTecnico = {
                ...findTransportista.responsableTecnico,
                ...responsableTecnico
            };
        }
        if (contingencias) {
            findTransportista.contingencias = {
                ...findTransportista.contingencias,
                ...contingencias
            };
        }
        if (generadores) findTransportista.generadores = generadores;
        if (conductores) findTransportista.conductores = conductores;
        if (estado) findTransportista.estado = estado;
        await findTransportista.save();

        return res.status(200).json({
            message: "Transportista editado correctamente",
            data: findTransportista,
            type: "Correcto"
        });
    } catch (error) {
        console.error("Error en patchTransportista:", error);
        return res.status(500).json({
            message: error.message,
            type: "Error"
        });
    }
};

module.exports = patchTransportista;