const { solicitarVinculacionExistente } = require("./solicitudGenerador");

// Compatibilidad para el botón de "solicitar vínculo". La identidad del
// transportista se obtiene de la sesión, nunca de IDs que envíe el navegador.
const postVinculacion = async (req, res) => {
    try {
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
