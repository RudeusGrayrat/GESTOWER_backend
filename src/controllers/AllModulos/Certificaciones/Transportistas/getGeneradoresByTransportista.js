const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");

const getGeneradoresByTransportista = async (req, res) => {
    try {
        const { transportistaId } = req.params;
        if (!transportistaId || transportistaId === "undefined") {
            return res.status(400).json({
                message: "Se requiere el ID del transportista",
                type: "Error"
            });
        }

        const transportista = await Transportista.findById(transportistaId).populate("generadores");
        if (!transportista) {
            return res.status(404).json({
                message: "Transportista no encontrado",
                type: "Error"
            });
        }

        return res.status(200).json({
            message: "Generadores obtenidos exitosamente",
            data: transportista.generadores,
            type: "Correcto"
        });
    } catch (error) {
        console.error("Error en getGeneradoresByTransportista:", error);
        return res.status(500).json({
            message: error.message,
            type: "Error"
        });
    }
};

module.exports = getGeneradoresByTransportista;