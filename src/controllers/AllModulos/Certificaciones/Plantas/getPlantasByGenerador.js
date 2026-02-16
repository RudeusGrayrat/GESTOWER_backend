const Planta = require("../../../../models/AllModulos/Certificacion/Plantas");
// GET - Obtener plantas por ID de generador
const getPlantasByGeneradorId = async (req, res) => {
    try {
        const { generadorId } = req.params;

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
            .sort({ denominacion: 1 });

        return res.status(200).json({
            message: "Plantas obtenidas exitosamente",
            plantas,
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