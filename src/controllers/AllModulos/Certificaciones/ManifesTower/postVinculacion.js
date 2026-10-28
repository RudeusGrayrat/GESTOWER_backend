const { solicitarVinculacionExistente } = require("./solicitudGenerador");
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");

// Compatibilidad para el botón de "solicitar vínculo". La identidad del
// transportista se obtiene de la sesión, nunca de IDs que envíe el navegador.
const postVinculacion = async (req, res) => {
    try {
        if (req.externalRole === "GENERADOR") {
            const transportistaId = req.body?.transportistaId || req.query?.transportistaId;
            if (!transportistaId) return res.status(400).json({ message: "Selecciona un transportista válido.", type: "Alerta" });
            const transportista = await Transportista.findById(transportistaId).select("_id razonSocial").lean();
            if (!transportista) return res.status(404).json({ message: "El transportista ya no está disponible.", type: "Alerta" });
            const existente = await Vinculacion.exists({ generadorId: req.externalUser.generadorId, transportistaId, status: { $in: ["PENDIENTE", "ACEPTADA"] }, fechaDesvinculacion: null });
            if (existente) return res.status(409).json({ message: "Ya existe una solicitud pendiente o una vinculación activa entre estas empresas.", type: "Alerta" });
            const vinculacion = await Vinculacion.create({ generadorId: req.externalUser.generadorId, transportistaId, iniciadoPor: "GENERADOR", status: "PENDIENTE" });
            const destinos = await UserExternal.find({ transportistaId, roles: "TRANSPORTISTA", estado: "ACTIVO" }).select("_id").lean();
            await Promise.allSettled(destinos.map((destino) => NotificationService.send(req.app.get("io"), { type: "INDIVIDUAL", title: "Solicitud de vinculación", message: "Un generador solicitó vincularse con tu empresa.", creator: { id: req.externalUser._id, model: "UserExternal" }, scope: { receiverModel: "UserExternal", receiverId: destino._id }, entity: { id: vinculacion._id, model: "Vinculacion" } })));
            return res.status(201).json({ message: "Solicitud de vinculación enviada con éxito.", type: "Correcto", data: vinculacion });
        }
        req.usuarioTransportista = req.externalUser;
        const resultado = await solicitarVinculacionExistente(req, req.body?.generadorId);
        return res.status(201).json({
            message: resultado.notificacionPendiente
                ? "Solicitud registrada, pero no se pudo notificar a la cuenta del generador."
                : "Solicitud de vinculación enviada con éxito.",
            type: "Correcto",
            data: resultado.vinculacion,
            notificacionPendiente: resultado.notificacionPendiente,
        });
    } catch (error) {
        const mensajes = {
            GENERADOR_INVALIDO: "El generador seleccionado no es válido.",
            GENERADOR_NO_ENCONTRADO: "El generador ya no está disponible.",
            TRANSPORTISTA_NO_DISPONIBLE: "La cuenta de transportista no está habilitada.",
            VINCULACION_EXISTENTE: "Ya existe una solicitud pendiente o una vinculación activa entre estas empresas.",
        };
        const status = error.status || (mensajes[error.message] ? 409 : 500);
        if (status === 500) console.error("Error al enviar solicitud de vinculación:", error);
        return res.status(status).json({ message: mensajes[error.message] || "Error interno del servidor al procesar vinculación.", type: "Error" });
    }
};

module.exports = postVinculacion;
