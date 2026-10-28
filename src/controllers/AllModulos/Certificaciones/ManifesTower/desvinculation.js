const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");

const desvinculation = async (req, res) => {
    try {
        const { transportistaId: solicitadoTransportista, generadorId: solicitadoGenerador, motivo } = { ...req.query, ...req.body };
        const usuarioId = req.externalUser?._id;
        const rolActivo = req.externalRole;
        const transportistaId = rolActivo === "TRANSPORTISTA" ? req.externalUser.transportistaId : solicitadoTransportista;
        const generadorId = rolActivo === "GENERADOR" ? req.externalUser.generadorId : solicitadoGenerador;
        const io = req.app.get("io");
        console.log("Parámetros recibidos:", { transportistaId, generadorId, usuarioId, rolActivo });
        if (!transportistaId || !generadorId || !usuarioId || !rolActivo) {
            return res.status(400).json({
                message: "Faltan parámetros requeridos (generadorId, transportistaId, usuarioId o rolActivo).",
                type: "Alerta"
            });
        }

        const iniciadoPor = rolActivo === "GENERADOR" ? "GENERADOR" : "TRANSPORTISTA";

        // 1. Buscar la vinculación activa entre ambas empresas
        const vinculacion = await Vinculacion.findOne({
            generadorId,
            transportistaId,
            status: "ACEPTADA",
            fechaDesvinculacion: null
        });

        if (!vinculacion) {
            return res.status(404).json({
                message: "No se encontró una vinculación activa entre estas empresas.",
                type: "Error"
            });
        }

        // 2. Eliminar al generador del array "generadores" dentro del Transportista
        //    $pull no necesita el subdocumento completo, solo el criterio de coincidencia
        const transportistaActualizado = await Transportista.findByIdAndUpdate(
            transportistaId,
            { $pull: { generadores: { generadorId: generadorId } } },
            { new: true }
        );

        if (!transportistaActualizado) {
            return res.status(404).json({ message: "Transportista no encontrado", type: "Error" });
        }

        const usuarioSolicitante = await UserExternal.findById(usuarioId)
            .populate("generadorId", "razonSocial ruc")
            .populate("transportistaId", "razonSocial ruc");
        console.log("Usuario solicitante encontrado:", usuarioSolicitante);
        vinculacion.fechaDesvinculacion = new Date();
        vinculacion.desvinculadoPor = usuarioId;
        vinculacion.motivoDesvinculacion = typeof motivo === "string" ? motivo.trim().slice(0, 500) : "";
        await vinculacion.save();

        const queryContraparte = iniciadoPor === "GENERADOR"
            ? { transportistaId, roles: "TRANSPORTISTA" }
            : { generadorId, roles: "GENERADOR" };

        const usuarioDestino = await UserExternal.findOne(queryContraparte)
            .populate("generadorId", "razonSocial ruc")
            .populate("transportistaId", "razonSocial ruc");

        if (usuarioDestino && usuarioSolicitante) {
            const razonSolicitante = iniciadoPor === "GENERADOR"
                ? usuarioSolicitante.generadorId?.razonSocial
                : usuarioSolicitante.transportistaId?.razonSocial;
            const rucSolicitante = iniciadoPor === "GENERADOR"
                ? usuarioSolicitante.generadorId?.ruc
                : usuarioSolicitante.transportistaId?.ruc;

            await NotificationService.send(io, {
                type: "INDIVIDUAL",
                title: `Vinculación finalizada por ${razonSolicitante}`,
                message: `El ${iniciadoPor.toLowerCase()} ${razonSolicitante} (RUC: ${rucSolicitante}) ha finalizado la vinculación contigo. Ya no podrán operar manifiestos de forma conjunta.`,
                creator: {
                    id: usuarioId, // 🌟 Quien ejecutó la acción, sea generador o transportista
                    model: "UserExternal"
                },
                scope: {
                    receiverModel: "UserExternal",
                    receiverId: usuarioDestino._id
                },
                entity: {
                    id: vinculacion._id,
                    model: "Vinculacion"
                }
            });
        }

        return res.status(200).json({
            message: "Desvinculación procesada correctamente.",
            type: "Correcto",
            data: {
                vinculacion,
                transportista: transportistaActualizado
            }
        });

    } catch (error) {
        console.error("Error al procesar la desvinculación:", error);
        return res.status(500).json({
            message: error.message || "Error interno del servidor al procesar la desvinculación.",
            type: "Error"
        });
    }
};

module.exports = desvinculation;
