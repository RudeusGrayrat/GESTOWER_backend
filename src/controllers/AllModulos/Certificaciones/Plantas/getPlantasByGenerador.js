const Planta = require("../../../../models/AllModulos/Certificacion/Plantas");
// GET - Obtener plantas por ID de generador
const getPlantasByGeneradorId = async (req, res) => {
    try {
        const { generadorId } = req.params;
        console.log("ID del generador recibido:", generadorId);
        if (!generadorId) {
            return res.status(400).json({
                message: "Se requiere el ID del generador",
                type: "Error"
            });
        }

        const plantas = await Planta.find({
            generadorId,
            estado: "ACTIVO"
        })
            .populate('ubigeoId', 'codigo departamento provincia distrito')
            .sort({ createdAt: -1 });
        console.log(`Plantas encontradas para el generador ${generadorId}:`, plantas);
        return res.status(200).json({
            message: "Plantas obtenidas exitosamente",
            data: plantas,
            type: "Correcto"
        });

    } catch (error) {
        console.error("Error en getPlantasByGeneradorId:", error);
        return res.status(500).json({
            message: error.message,
            type: "Error"
        });
    }
};

module.exports = getPlantasByGeneradorId;