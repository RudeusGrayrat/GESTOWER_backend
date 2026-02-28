const Destino = require("../../../../models/AllModulos/Certificacion/Destino");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Planta = require("../../../../models/AllModulos/Certificacion/Plantas");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");

const postManifiesto = async (req, res) => {
    try {
        const {
            numeroManifiesto,
            año,
            mes,
            generadorId,
            plantaId,
            servicioTransporte,
            transportistaId,
            destinoId,
            tipoManejo,
            comercializable,
            residuo,
            peligrosidad,
            transporte,
            destinoFinal,
            otrosManejos,
            devolucionManifiesto,
            referendoEntrega,
            referendoRecepcion,
            estado,
            creadoPor
        } = req.body;

        // Validaciones de campos requeridos
        if (!numeroManifiesto || !año || !mes || !generadorId || !plantaId || !transportistaId || !destinoId) {
            return res.status(400).json({
                message: "Faltan datos requeridos para crear el manifiesto (generador, planta, transportista, destino)",
                type: "Error"
            });
        }

        // Validar datos del residuo
        if (!residuo?.descripcion || !residuo?.cantidadTotal || !residuo?.estadoFisico || !residuo?.codigoBasilea) {
            return res.status(400).json({
                message: "Complete todos los datos del residuo (descripción, cantidad, estado físico, código Basilea)",
                type: "Error"
            });
        }

        // Validar datos de transporte
        if (!transporte?.nombreConductor || !transporte?.tipoVehiculo || !transporte?.placaVehiculo || !transporte?.fechaRecepcion || !transporte?.cantidadRecibida) {
            return res.status(400).json({
                message: "Complete todos los datos del transporte",
                type: "Error"
            });
        }

        // Validar datos de destino final
        if (!destinoFinal?.cantidadEntregada) {
            return res.status(400).json({
                message: "Complete la cantidad entregada en destino final",
                type: "Error"
            });
        }

        // Validar referendos (si vienen completos)
        // if (referendoEntrega && (!referendoEntrega.nombreGenerador || !referendoEntrega.nombreTransportista)) {
        //     return res.status(400).json({
        //         message: "Complete los datos del referendo de entrega",
        //         type: "Error"
        //     });
        // }

        // Verificar si ya existe un manifiesto con el mismo número
        const findManifiesto = await Manifiesto.findOne({ numeroManifiesto });
        if (findManifiesto) {
            return res.status(400).json({
                message: "El número de manifiesto ya existe",
                type: "Error"
            });
        }

        // Verificar que todas las entidades relacionadas existan
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

        const newManifiesto = new Manifiesto({
            numeroManifiesto,
            año,
            mes,
            generadorId,
            plantaId,
            servicioTransporte: servicioTransporte || 'SERVICIO TOWER',
            transportistaId,
            destinoId,
            tipoManejo: tipoManejo || destino.tipoManejo,
            comercializable: comercializable || false,
            residuo,
            peligrosidad: peligrosidad || {},
            transporte,
            destinoFinal,
            otrosManejos: otrosManejos || {},
            devolucionManifiesto: devolucionManifiesto || {},
            referendoEntrega: referendoEntrega || {},
            referendoRecepcion: referendoRecepcion || {},
            estado: estado || "PENDIENTE",
            creadoPor: creadoPor || req.user?.id
        });

        await newManifiesto.save();

        // Poblar los datos para la respuesta
        const manifiestoCompleto = await Manifiesto.findById(newManifiesto._id)
            .populate('generadorId')
            .populate('plantaId')
            .populate('transportistaId')
            .populate('destinoId')
            .populate('creadoPor', 'nombre email'); // Populate del usuario creador

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