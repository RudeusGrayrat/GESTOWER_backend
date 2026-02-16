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
            transportistaId,
            destinoId,
            residuo,
            peligrosidad,
            transporte,
            referendoEntrega,
            destinoFinal,
            referendoRecepcion,
            otrosManejos,
            contingencias,
            devolucionManifiesto,
            estado
        } = req.body;

        // Validaciones de campos requeridos
        if (!numeroManifiesto || !año || !mes || !generadorId || !plantaId || !transportistaId || !destinoId || !residuo?.descripcion || !residuo?.cantidadTotal || !residuo?.estadoFisico) {
            return res.status(400).json({
                message: "Faltan datos requeridos para crear el manifiesto",
            });
        }

        // Verificar si ya existe un manifiesto con el mismo número
        const findManifiesto = await Manifiesto.findOne({ numeroManifiesto });
        if (findManifiesto) {
            return res.status(400).json({
                message: "El número de manifiesto ya existe",
            });
        }

        // Verificar que todas las entidades relacionadas existan
        const [generador, planta, transportista, destino] = await Promise.all([
            Generador.findById(generadorId),
            Planta.findById(plantaId),
            Transportista.findById(transportistaId),
            Destino.findById(destinoId)
        ]);

        if (!generador) return res.status(404).json({ message: "Generador no encontrado" });
        if (!planta) return res.status(404).json({ message: "Planta no encontrada" });
        if (!transportista) return res.status(404).json({ message: "Transportista no encontrado" });
        if (!destino) return res.status(404).json({ message: "Destino no encontrado" });

        // Verificar que la planta pertenezca al generador
        if (planta.generadorId.toString() !== generadorId) {
            return res.status(400).json({
                message: "La planta no pertenece al generador especificado",
            });
        }

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
            transporte: transporte || {},
            referendoEntrega: referendoEntrega || {},
            destinoFinal: destinoFinal || {},
            referendoRecepcion: referendoRecepcion || {},
            otrosManejos: otrosManejos || [],
            contingencias: contingencias || {},
            devolucionManifiesto: devolucionManifiesto || {},
            estado: estado || "REGISTRADO",
            creadoPor: req.user?.id // Asumiendo que tienes el usuario en el request
        });

        await newManifiesto.save();
        return res.status(201).json({
            message: "Manifiesto creado exitosamente",
            data: newManifiesto
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Error al crear el manifiesto",
        });
    }
};

module.exports = postManifiesto;