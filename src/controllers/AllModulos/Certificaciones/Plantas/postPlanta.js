const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Planta = require("../../../../models/AllModulos/Certificacion/Plantas");
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");

const postPlanta = async (req, res) => {
    try {
        const {
            generadorId,
            denominacion,
            tipoPlanta,
            direccion,
            ubigeoId,
            coordenadasUtm,
            actividadEconomica,
            sector,
            responsableGestion,
            tieneIga,
            institucionApruebaIga,
            fechaAprobacionIga,
            numeroResolucionIga,
            estado
        } = req.body;

        if (!generadorId || !denominacion || !direccion || !ubigeoId || !responsableGestion?.nombre || !responsableGestion?.cargo || !responsableGestion?.dni || !responsableGestion?.correo || !responsableGestion?.telefono) {
            return res.status(400).json({
                message: "Faltan datos requeridos para crear la planta",
            });
        }

        // Verificar que el generador exista
        const findGenerador = await Generador.findById(generadorId);
        if (!findGenerador) {
            return res.status(404).json({
                message: "Generador no encontrado",
            });
        }

        // Verificar que el ubigeo exista
        const findUbigeo = await Ubigeo.findById(ubigeoId);
        if (!findUbigeo) {
            return res.status(404).json({
                message: "Ubigeo no encontrado",
            });
        }

        const newPlanta = new Planta({
            generadorId,
            denominacion,
            tipoPlanta: tipoPlanta || "PRINCIPAL",
            direccion,
            ubigeoId,
            coordenadasUtm: coordenadasUtm || {},
            actividadEconomica,
            sector,
            responsableGestion,
            tieneIga: tieneIga || false,
            institucionApruebaIga,
            fechaAprobacionIga,
            numeroResolucionIga,
            estado: estado || "ACTIVO",
        });

        await newPlanta.save();
        return res.status(201).json({
            message: "Planta creada exitosamente",
            data: newPlanta,
            type: "Correcto"
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Error al crear la planta",
        });
    }
};

module.exports = postPlanta;