const Destino = require("../../../../models/AllModulos/Certificacion/Destino");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Planta = require("../../../../models/AllModulos/Certificacion/Plantas");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const generarCorrelativaManifiesto = require("./correlativaManifiesto");

const postManifiesto = async (req, res) => {
    try {
        const {
            año,
            mes,
            plantaId,
            generadorId,
            residuo,
            peligrosidad,
            transportistaId,
            transporte,
            referendoEntrega,
            destinoId,
            destinoFinal,
            referendoRecepcion,
            otrosManejos,
            otrasObligaciones,
            estado,
            creadoPor
        } = req.body;

        // Validaciones básicas (coinciden con los * del front)
        if (!año || !mes || !generadorId || !plantaId || !transportistaId || !destinoId) {
            return res.status(400).json({
                message: "Faltan datos requeridos: año, mes, generador, planta, transportista, destino",
                type: "Error"
            });
        }

        if (!residuo?.descripcion || !residuo?.cantidadTotal || !residuo?.estadoFisico || !residuo?.codigoBasilea) {
            return res.status(400).json({
                message: "Complete los datos del residuo (descripción, cantidad, estado físico, código Basilea)",
                type: "Error"
            });
        }

        if (!transporte?.fechaRecepcion || !transporte?.cantidadRecibida || !transporte?.tipoVehiculo || !transporte?.placaVehiculo) {
            return res.status(400).json({
                message: "Complete los datos del transporte (fecha, cantidad, tipo y placa del vehículo)",
                type: "Error"
            });
        }

        if (!destinoFinal?.cantidadEntregada) {
            return res.status(400).json({
                message: "Complete la cantidad entregada en destino final",
                type: "Error"
            });
        }

        // Verificar existencia de entidades relacionadas
        const [generador, planta, transportista, destino] = await Promise.all([
            Generador.findById(generadorId),
            Planta.findById(plantaId),
            Transportista.findById(transportistaId),
            Destino.findById(destinoId)
        ]);

        if (!generador) return res.status(404).json({ message: "Generador no encontrado", type: "Error" });
        if (!planta) return res.status(404).json({ message: "Planta no encontrada", type: "Error" });
        if (!transportista) return res.status(404).json({ message: "Transportista no encontrado", type: "Error" });
        if (!destino) return res.status(404).json({ message: "Destino no encontrado", type: "Error" });

        // Verificar que la planta pertenezca al generador
        if (planta.generadorId?.toString() !== generadorId) {
            return res.status(400).json({
                message: "La planta no pertenece al generador especificado",
                type: "Error"
            });
        }

        // Generar número de manifiesto correlativo
        const numeroManifiesto = await generarCorrelativaManifiesto(año);

        // Crear el manifiesto con la estructura completa del front
        const newManifiesto = new Manifiesto({
            numeroManifiesto,
            año,
            mes,
            generadorId,
            plantaId,
            transportistaId,
            destinoId,
            residuo,
            peligrosidad: peligrosidad || {},
            transporte,
            destinoFinal,
            otrosManejos: otrosManejos || {},
            referendoEntrega: referendoEntrega || { referendo: false },
            referendoRecepcion: referendoRecepcion || { referendo: false },
            otrasObligaciones: otrasObligaciones || {},
            estado: estado || "PENDIENTE",
            creadoPor: creadoPor || req.user?.id
        });

        await newManifiesto.save();

        // Poblar datos para la respuesta
        const manifiestoCompleto = await Manifiesto.findById(newManifiesto._id)
            .populate('generadorId')
            .populate('plantaId')
            .populate('transportistaId')
            .populate('destinoId')
            .populate('creadoPor', 'nombre email');

        return res.status(201).json({
            message: "Manifiesto creado exitosamente",
            type: "Correcto",
            data: manifiestoCompleto
        });
    } catch (error) {
        console.error("Error en postManifiesto:", error);
        return res.status(500).json({
            message: error.message || "Error al crear el manifiesto",
            type: "Error"
        });
    }
};

module.exports = postManifiesto;