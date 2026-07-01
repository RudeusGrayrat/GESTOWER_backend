// controllers/AllModulos/Certificaciones/ManifesTower/getSolicitudesVinculacion.js
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");

const getSolicitudesVinculacion = async (req, res) => {
    try {
        const { transportistaId, generadorId, tipo } = req.query;
        let query = {};

        // Filtro base por empresa vinculada
        if (transportistaId) query.transportistaId = transportistaId;
        if (generadorId) query.generadorId = generadorId;

        // Clasificación inteligente para paneles en el Frontend
        if (tipo === "ENVIADAS") {
            if (generadorId) query.iniciadoPor = "GENERADOR";
            if (transportistaId) query.iniciadoPor = "TRANSPORTISTA";
        } else if (tipo === "RECIBIDAS") {
            if (generadorId) query.iniciadoPor = "TRANSPORTISTA";
            if (transportistaId) query.iniciadoPor = "GENERADOR";
        }

        // Buscamos y populamos datos clave de las colecciones mapeadas
        const solicitudes = await Vinculacion.find(query)
            .populate("generadorId", "razonSocial ruc direccion")
            .populate("transportistaId", "razonSocial ruc direccion")
            .sort({ createdAt: -1 });
        console.log(`🔍 Solicitudes encontradas: ${solicitudes.length} para transportistaId=${transportistaId}, generadorId=${generadorId}, tipo=${tipo}`);
        return res.status(200).json({
            message: "Solicitudes de vinculación obtenidas con éxito.",
            type: "Correcto",
            data: solicitudes
        });

    } catch (error) {
        console.error('Error al obtener solicitudes de vinculación:', error);
        return res.status(500).json({ message: 'Error interno del servidor.', type: 'Error' });
    }
};

module.exports = getSolicitudesVinculacion;