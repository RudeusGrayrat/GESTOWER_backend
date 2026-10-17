const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const snapshotFirma = require("../../../../utils/manifiestoFirmaSnapshot");

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
        manifiesto.$where = { estado: "PENDIENTE" };

        // ==========================================
        // 🛡️ VALIDACIÓN DE FIRMA DEL GENERADOR
        // ==========================================
        const perfilGenerador = await Generador.findById(manifiesto.generadorId?._id || manifiesto.generadorId);
        const responsablesConFirma = (perfilGenerador?.responsablesTecnicos || []).filter(
            (resp) => typeof resp.firmaResponsable === "string" && resp.firmaResponsable.trim() !== ""
        );
        const nombreSeleccionado = manifiesto.referendoEntrega?.generadorResponsableManejo;
        const responsableFirmante = nombreSeleccionado
            ? responsablesConFirma.find((resp) => resp.nombreResponsable === nombreSeleccionado)
            : responsablesConFirma[0];

        if (!responsableFirmante) {
            return res.status(400).json({
                message: "El responsable seleccionado no tiene una imagen de firma registrada. Revisa el responsable y su firma antes de aprobar.",
                type: "Alerta"
            });
        }
        // ==========================================

        let firmaGenerador;
        try {
            firmaGenerador = await snapshotFirma(responsableFirmante.firmaResponsable);
        } catch (error) {
            return res.status(400).json({ message: `No se pudo conservar la firma del generador: ${error.message}`, type: "Alerta" });
        }
        const fechaFirma = new Date();
        manifiesto.referendoEntrega = {
            ...manifiesto.referendoEntrega?.toObject(),
            referendo: true,
            generadorResponsableManejo: responsableFirmante.nombreResponsable,
            firmaGenerador,
            fechaHora: fechaFirma,
        };
        manifiesto.eventosFirma.push({
            accion: "APROBACION_GENERADOR",
            fecha: fechaFirma,
            actorIdDeclarado: usuarioId,
            actorTipo: "UserExternal",
            identidadVerificada: !!req.externalUser,
            responsables: [{
                rol: "GENERADOR",
                nombre: responsableFirmante.nombreResponsable,
                dni: responsableFirmante.dniResponsable,
                cargo: responsableFirmante.cargoResponsable,
                firma: firmaGenerador,
            }],
        });
        manifiesto.estado = "ENVIADO";
        manifiesto.fechaEnvio = fechaFirma;
        manifiesto.firmadoPorGenerador = usuarioId;
        manifiesto.observacion = "";
        manifiesto.historialRevision.push({ estado: "ENVIADO", origen: "GENERADOR", fecha: fechaFirma, actorIdDeclarado: usuarioId });
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
                    message: `El generador ${manifiesto.generadorId?.razonSocial} ha aprobado el manifiesto ${manifiesto.numeroManifiesto} usando su firma registrada. El documento ha sido enviado al destino.`,
                    creator: { id: usuarioId, model: "UserExternal" },
                    scope: { receiverModel: "UserExternal", receiverId: usuarioTransportista._id },
                    entity: { id: manifiesto._id, model: "Manifiesto" }
                });
            }

        } catch (errNotif) {
            console.error("⚠️ Error silencioso al despachar notificaciones de aprobación:", errNotif);
        }

        return res.status(200).json({
            message: "Manifiesto aprobado con la firma registrada y enviado al destino.",
            type: "Correcto",
            data: manifiesto
        });

    } catch (error) {
        if (error.name === "DocumentNotFoundError") return res.status(409).json({ message: "El manifiesto cambió durante la revisión. Actualiza la lista.", type: "Advertencia" });
        console.error("❌ Error en aprobarManifiestoGenerador:", error);
        return res.status(500).json({ message: "Error interno en el servidor al firmar el manifiesto.", type: "Error" });
    }
};

module.exports = aprobarManifiestoGenerador;
