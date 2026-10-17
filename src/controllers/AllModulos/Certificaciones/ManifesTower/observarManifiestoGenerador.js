const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");

const observarManifiestoGenerador = async (req, res) => {
    try {
        const observacion = typeof req.body.observacion === "string" ? req.body.observacion.trim() : "";
        const { usuarioId } = req.body;
        if (!observacion) return res.status(400).json({ message: "Indique qué debe corregirse.", type: "Advertencia" });
        const manifiesto = await Manifiesto.findById(req.params.id);
        if (!manifiesto) return res.status(404).json({ message: "El manifiesto no existe.", type: "Advertencia" });
        if (manifiesto.estado !== "PENDIENTE") return res.status(400).json({ message: "Solo se puede observar un manifiesto pendiente de revisión del generador.", type: "Advertencia" });
        manifiesto.$where = { estado: "PENDIENTE" };

        manifiesto.estado = "OBSERVADO";
        manifiesto.observacion = observacion;
        manifiesto.historialRevision.push({ estado: "OBSERVADO", observacion, origen: "GENERADOR", fecha: new Date(), actorIdDeclarado: usuarioId });
        await manifiesto.save();

        let notificacionesPendientes = false;
        try {
            const usuarios = await UserExternal.find({ transportistaId: manifiesto.transportistaId, roles: "TRANSPORTISTA", estado: "ACTIVO" }).select("_id").lean();
            const resultados = await Promise.allSettled(usuarios.map((usuario) => NotificationService.send(req.app.get("io"), {
                type: "INDIVIDUAL", title: `Manifiesto observado: ${manifiesto.numeroManifiesto}`,
                message: `El generador solicitó corregir el manifiesto ${manifiesto.numeroManifiesto}. Motivo: ${observacion}`,
                creator: { id: usuarioId, model: usuarioId ? "UserExternal" : "System" },
                scope: { receiverModel: "UserExternal", receiverId: usuario._id },
                entity: { id: manifiesto._id, model: "Manifiesto" },
            })));
            notificacionesPendientes = !usuarios.length || resultados.some((resultado) => resultado.status === "rejected");
        } catch (error) {
            notificacionesPendientes = true;
            console.error("No se pudo notificar la observación:", error);
        }
        return res.json({ message: notificacionesPendientes
            ? "Observación guardada, pero no se pudo notificar al transportista."
            : "Observación enviada al transportista para su corrección.", type: "Correcto", data: manifiesto, notificacionesPendientes });
    } catch (error) {
        if (error.name === "DocumentNotFoundError") return res.status(409).json({ message: "El manifiesto cambió durante la revisión. Actualiza la lista.", type: "Advertencia" });
        console.error("Error al observar el manifiesto:", error);
        return res.status(500).json({ message: "No se pudo registrar la observación.", type: "Error" });
    }
};

module.exports = observarManifiestoGenerador;
