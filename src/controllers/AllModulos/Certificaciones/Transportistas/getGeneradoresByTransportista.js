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

        const transportista = await Transportista.findById(transportistaId).populate("generadores.generadorId");
        if (!transportista) {
            return res.status(404).json({
                message: "Transportista no encontrado",
                type: "Error"
            });
        }
        console.log("Generadores encontrados para el transportista:", transportista.generadores);
        const dataGeneradores = transportista.generadores.map(g =>
            //el contenido verdero está dentro del generadorId, por eso se hace el mapeo
            g.generadorId ? {
                ...g.generadorId.toObject(),
                tienePermisoLlenado: g.tienePermisoLlenado
            } : null
        ).filter(g => g !== null); // Filtramos los generadores nulos
        console.log("Generadores mapeados:", dataGeneradores);
        return res.status(200).json({
            message: "Generadores obtenidos exitosamente",
            data: dataGeneradores,
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