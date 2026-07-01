// controllers/AllModulos/Certificaciones/ManifesTower/postVinculacion.js
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");

const postVinculacion = async (req, res) => {
    try {
        // 🌟 Recibimos también 'usuarioId' y 'rolActivo' por query params
        const { transportistaId, generadorId, usuarioId, rolActivo } = req.query;
        console.log("Parámetros recibidos:", { transportistaId, generadorId, usuarioId, rolActivo });
        const io = req.app.get("io");

        if (!transportistaId || !generadorId || !usuarioId || !rolActivo) {
            return res.status(400).json({
                message: "Faltan parámetros requeridos (generadorId, transportistaId, usuarioId o rolActivo).",
                type: "Alerta"
            });
        }

        // 🌟 Reemplazamos req.user.roles utilizando el 'rolActivo' enviado desde el Front
        const iniciadoPor = rolActivo === "GENERADOR" ? "GENERADOR" : "TRANSPORTISTA";
        let idGenerador
        let idTransportista
        const usuarioSolicitante = await UserExternal.findById(usuarioId)
            .populate("generadorId", "razonSocial ruc")
            .populate("transportistaId", "razonSocial ruc");
        if (iniciadoPor === "GENERADOR") {
            idGenerador = usuarioSolicitante.generadorId
            idTransportista = transportistaId
        }
        if (iniciadoPor === "TRANSPORTISTA") {
            idGenerador = generadorId
            idTransportista = usuarioSolicitante.transportistaId
        }
        // 1. Evitar duplicaciones activas o pendientes
        const existeVinculacion = await Vinculacion.findOne({
            generadorId: idGenerador,
            transportistaId: idTransportista,
            status: { $in: ['PENDIENTE', 'ACEPTADA'] },
            fechaDesvinculacion: null
        });

        if (existeVinculacion) {
            return res.status(400).json({ message: 'Ya existe una solicitud pendiente o una vinculación activa entre estas empresas.', type: 'Alerta' });
        }

        // 2. Crear y guardar la vinculación
        const nuevaVinculacion = new Vinculacion({
            generadorId: idGenerador,
            transportistaId: idTransportista,
            iniciadoPor,
            status: 'PENDIENTE'
        });

        await nuevaVinculacion.save();

        // 3. Buscar el usuario externo de la contraparte para enviarle la notificación individual
        const queryContraparte = iniciadoPor === "GENERADOR"
            ? { transportistaId: idTransportista, roles: "TRANSPORTISTA" }
            : { generadorId: idGenerador, roles: "GENERADOR" };

        const usuarioDestino = await UserExternal.findOne(queryContraparte)
            .populate("generadorId", "razonSocial ruc")
            .populate("transportistaId", "razonSocial ruc");

        if (usuarioDestino) {
            const razonSolicitante = iniciadoPor === "GENERADOR" ? usuarioSolicitante.generadorId.razonSocial : usuarioSolicitante.transportistaId.razonSocial;
            const rucSolicitante = iniciadoPor === "GENERADOR" ? usuarioSolicitante.generadorId.ruc : usuarioSolicitante.transportistaId.ruc;
            await NotificationService.send(io, {
                type: "INDIVIDUAL",
                title: `Nueva solicitud de asociación de ${razonSolicitante}`,
                message: `Has recibido una nueva solicitud de vinculación del ${iniciadoPor}: ${razonSolicitante} - RUC: ${rucSolicitante}. Revisa el apartado de solicitudes.`,
                creator: {
                    id: usuarioId, // 🌟 Usamos el usuarioId que vino por query
                    model: "UserExternal"
                },
                scope: {
                    receiverModel: "UserExternal",
                    receiverId: usuarioDestino._id
                },
                entity: {
                    id: nuevaVinculacion._id,
                    model: "Vinculacion"
                }
            });
        }

        return res.status(201).json({
            message: 'Solicitud de vinculación enviada con éxito.',
            type: 'Correcto',
            data: nuevaVinculacion
        });

    } catch (error) {
        console.error('Error al enviar solicitud de vinculación:', error);
        return res.status(500).json({ message: 'Error interno del servidor al procesar vinculación.', type: 'Error' });
    }
};

module.exports = postVinculacion;