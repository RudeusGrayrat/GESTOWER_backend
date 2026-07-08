const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");

const aprobarManifiestoGenerador = async (req, res) => {
    try {
        const { id } = req.params;
        const { usuarioId, otorgarPermisoLlenado } = req.query;
        const io = req.app.get("io");

        if (!usuarioId) {
            return res.status(400).json({ message: "El ID del usuario firmante es requerido.", type: "Alerta" });
        }

        const manifiesto = await Manifiesto.findById(id)
            .populate("generadorId", "razonSocial ruc")
            .populate("transportistaId", "razonSocial ruc");

        if (!manifiesto) {
            return res.status(404).json({ message: "El manifiesto solicitado no existe.", type: "Alerta" });
        }

        if (manifiesto.estado !== "PENDIENTE") {
            return res.status(400).json({ message: "Solo se pueden firmar manifiestos en estado PENDIENTE.", type: "Alerta" });
        }

        // ==========================================
        // 🛡️ VALIDACIÓN DE FIRMA DEL GENERADOR
        // ==========================================
        const perfilGenerador = await Generador.findById(manifiesto.generadorId?._id || manifiesto.generadorId);
        const tieneFirmaActiva = perfilGenerador?.responsablesTecnicos?.some(
            (resp) => resp.firmaResponsable && resp.firmaResponsable.trim() !== ""
        );

        if (!tieneFirmaActiva) {
            return res.status(400).json({
                message: "Operación Bloqueada: Tu empresa Generadora no cuenta con una firma digital registrada en su Perfil Técnico. Ve a Configuración de Cuenta y sube tu firma antes de aprobar.",
                type: "Alerta"
            });
        }
        // ==========================================

        manifiesto.estado = "ENVIADO";
        manifiesto.fechaEnvio = new Date();
        manifiesto.firmadoPorGenerador = usuarioId;
        await manifiesto.save();

        // 3. Evaluar e inyectar el permiso automático si el Generador lo autorizó en el diálogo
        const activarPermisoFlujo = otorgarPermisoLlenado === "true" || otorgarPermisoLlenado === true;
        if (activarPermisoFlujo) {
            const gId = manifiesto.generadorId?._id || manifiesto.generadorId;
            const tId = manifiesto.transportistaId?._id || manifiesto.transportistaId;

            // Actualizamos la vinculación intermedia
            await Vinculacion.updateOne(
                { generadorId: gId, transportistaId: tId, status: "ACEPTADA" },
                { $set: { tienePermisoLlenado: true } }
            );

            // Sincronizamos el arreglo embebido en la colección del Transportista
            await Transportista.updateOne(
                { _id: tId, "generadores.generadorId": gId },
                { $set: { "generadores.$.tienePermisoLlenado": true } }
            );
        }

        // 4. DESPACHO DE NOTIFICACIONES EN PARALELO
        try {
            // A. Notificación al ERP Interno de la Torre (Submódulo Manifiestos)
            await NotificationService.send(io, {
                type: "SUBMODULE",
                title: `Manifiesto Autorizado: #${manifiesto.numeroManifiesto}`,
                message: `El manifiesto ${manifiesto.numeroManifiesto} del transportista ${manifiesto.transportistaId?.razonSocial} ha sido firmado y aprobado por el generador ${manifiesto.generadorId?.razonSocial}. Procede al despacho operativo directo.`,
                creator: { id: usuarioId, model: "UserExternal" },
                scope: { submoduleName: "MANIFIESTOS", moduleName: "OPERACIONES" },
                entity: { id: manifiesto._id, model: "Manifiesto" }
            });

            // B. Notificación individual al operador del Transportista que originó el borrador
            const usuarioTransportista = await UserExternal.findOne({
                transportistaId: manifiesto.transportistaId?._id || manifiesto.transportistaId,
                roles: "TRANSPORTISTA"
            });

            if (usuarioTransportista) {
                await NotificationService.send(io, {
                    type: "INDIVIDUAL",
                    title: "Manifiesto Aprobado y Firmado",
                    message: `El generador ${manifiesto.generadorId?.razonSocial} ha firmado digitalmente el manifiesto ${manifiesto.numeroManifiesto}. El documento ha sido despachado al destino de forma automática.`,
                    creator: { id: usuarioId, model: "UserExternal" },
                    scope: { receiverModel: "UserExternal", receiverId: usuarioTransportista._id },
                    entity: { id: manifiesto._id, model: "Manifiesto" }
                });
            }

        } catch (errNotif) {
            console.error("⚠️ Error silencioso al despachar notificaciones de aprobación:", errNotif);
        }

        return res.status(200).json({
            message: "Manifiesto firmado digitalmente y despachado con éxito al destino.",
            type: "Correcto",
            data: manifiesto
        });

    } catch (error) {
        console.error("❌ Error en aprobarManifiestoGenerador:", error);
        return res.status(500).json({ message: "Error interno en el servidor al firmar el manifiesto.", type: "Error" });
    }
};

module.exports = aprobarManifiestoGenerador;