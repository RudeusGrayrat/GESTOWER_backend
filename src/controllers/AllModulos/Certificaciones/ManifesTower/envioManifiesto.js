const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const snapshotFirma = require("../../../../utils/manifiestoFirmaSnapshot");

const enviarManifiesto = async (req, res) => {
    try {
        const { id } = req.params;
        const io = req.app.get("io");
        // Identidad declarada; aún no sustituye la autenticación del servidor.
        const usuarioTransportistaId = req.user?._id || req.body?.usuarioId;

        const manifiesto = await Manifiesto.findById(id)
            .populate("generadorId", "razonSocial ruc")
            .populate("transportistaId", "razonSocial ruc");

        if (!manifiesto) {
            return res.status(404).json({ message: "El manifiesto solicitado no existe.", type: "Alerta" });
        }

        if (manifiesto.estado !== "BORRADOR" && manifiesto.estado !== "OBSERVADO") {
            return res.status(400).json({ message: "Solo se pueden enviar manifiestos en estado BORRADOR u OBSERVADO.", type: "Alerta" });
        }
        manifiesto.$where = { estado: manifiesto.estado };

        // ==========================================
        // 🛡️ VALIDACIÓN DE FIRMA DEL TRANSPORTISTA
        // ==========================================
        const perfilTransportista = await Transportista.findById(manifiesto.transportistaId?._id || manifiesto.transportistaId);
        const responsablesConFirma = (perfilTransportista?.responsables || []).filter(
            (resp) => typeof resp.firmaResponsable === "string" && resp.firmaResponsable.trim() !== ""
        );
        const nombreSeleccionado = manifiesto.referendoEntrega?.responsableEors;
        const responsableFirmante = nombreSeleccionado
            ? responsablesConFirma.find((resp) => resp.nombre === nombreSeleccionado)
            : responsablesConFirma[0];

        if (!responsableFirmante) {
            return res.status(400).json({
                message: "No puedes enviar este manifiesto. El responsable del transportista seleccionado no tiene una imagen de firma registrada.",
                type: "Alerta"
            });
        }
        // ==========================================

        const alianzasB2B = await Vinculacion.findOne({
            generadorId: manifiesto.generadorId?._id || manifiesto.generadorId,
            transportistaId: manifiesto.transportistaId?._id || manifiesto.transportistaId,
            status: "ACEPTADA",
            fechaDesvinculacion: null,
        });
        if (!alianzasB2B) {
            return res.status(400).json({
                message: "No existe una vinculación comercial activa y aprobada con este Generador para procesar el envío.",
                type: "Alerta"
            });
        }

        let firmaTransportista;
        try {
            firmaTransportista = await snapshotFirma(responsableFirmante.firmaResponsable);
        } catch (error) {
            return res.status(400).json({ message: `No se pudo conservar la firma del transportista: ${error.message}`, type: "Alerta" });
        }
        const fechaFirma = new Date();
        manifiesto.referendoEntrega = {
            ...manifiesto.referendoEntrega?.toObject(),
            referendo: true,
            responsableEors: responsableFirmante.nombre,
            dniResponsableEors: responsableFirmante.dni,
            cargoResponsableEors: responsableFirmante.cargo,
            firmaResponsableEors: firmaTransportista,
            firmaGenerador: "",
            fechaHora: fechaFirma,
        };
        manifiesto.firmadoPorGenerador = undefined;
        manifiesto.eventosFirma.push({
            accion: "ENVIO_TRANSPORTISTA",
            fecha: fechaFirma,
            actorIdDeclarado: usuarioTransportistaId,
            actorTipo: "UserExternal",
            identidadVerificada: !!req.externalUser,
            responsables: [{ rol: "TRANSPORTISTA", nombre: responsableFirmante.nombre, dni: responsableFirmante.dni, cargo: responsableFirmante.cargo, firma: firmaTransportista }],
        });

        manifiesto.estado = "ENVIADO";
        manifiesto.fechaEnvio = fechaFirma;
        manifiesto.observacion = "";
        manifiesto.historialRevision.push({ estado: "ENVIADO", origen: "TRANSPORTISTA", fecha: fechaFirma, actorIdDeclarado: usuarioTransportistaId });
        await manifiesto.save();
        let notificacionesPendientes = false;
        try {
            await NotificationService.send(io, {
                type: "SUBMODULE",
                title: `Manifiesto enviado: ${manifiesto.numeroManifiesto}`,
                message: `El transportista ${manifiesto.transportistaId?.razonSocial} envió el manifiesto ${manifiesto.numeroManifiesto} para revisión de Tower.`,
                creator: { id: usuarioTransportistaId, model: "UserExternal" },
                scope: { submoduleName: "MANIFIESTOS", moduleName: "CERTIFICACIONES" },
                entity: { id: manifiesto._id, model: "Manifiesto" },
            });
        } catch (error) { notificacionesPendientes = true; console.error("No se pudo notificar a Tower:", error); }
        return res.status(200).json({ message: notificacionesPendientes ? "Manifiesto enviado a Tower, pero no se pudo emitir la notificación." : "Manifiesto enviado a Tower para su revisión.", type: "Correcto", estado: "ENVIADO", data: manifiesto, notificacionesPendientes });

    } catch (error) {
        if (error.name === "DocumentNotFoundError") return res.status(409).json({ message: "El manifiesto cambió mientras se enviaba. Actualiza la lista.", type: "Advertencia" });
        console.error("❌ Error catastrófico en enviarManifiesto:", error);
        return res.status(500).json({ message: "Error interno del servidor al procesar el envío.", type: "Error" });
    }
};

module.exports = enviarManifiesto;
