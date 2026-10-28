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
        const usuarioActorId = req.externalUser?._id || req.user?._id;
        const actorRol = req.externalRole || "TRANSPORTISTA";

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

        const fechaFirma = new Date();
        if (actorRol === "TRANSPORTISTA") {
        const perfilTransportista = await Transportista.findById(manifiesto.transportistaId?._id || manifiesto.transportistaId);
        const responsablesConFirma = (perfilTransportista?.responsables || []).filter((resp) => typeof resp.firmaResponsable === "string" && resp.firmaResponsable.trim());
        const nombreSeleccionado = manifiesto.referendoEntrega?.responsableEors;
        const responsableFirmante = nombreSeleccionado ? responsablesConFirma.find((resp) => resp.nombre === nombreSeleccionado) : responsablesConFirma[0];
        if (!responsableFirmante) return res.status(400).json({ message: "El responsable del transportista seleccionado no tiene una imagen de firma registrada.", type: "Alerta" });
        let firmaTransportista;
        try { firmaTransportista = await snapshotFirma(responsableFirmante.firmaResponsable); }
        catch (error) { return res.status(400).json({ message: `No se pudo conservar la firma del transportista: ${error.message}`, type: "Alerta" }); }
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
            actorIdDeclarado: usuarioActorId,
            actorTipo: "UserExternal",
            identidadVerificada: !!req.externalUser,
            responsables: [{ rol: "TRANSPORTISTA", nombre: responsableFirmante.nombre, dni: responsableFirmante.dni, cargo: responsableFirmante.cargo, firma: firmaTransportista }],
        });
        } else {
            manifiesto.referendoEntrega = { ...manifiesto.referendoEntrega?.toObject(), referendo: false, firmaResponsableEors: "", firmaGenerador: "", fechaHora: fechaFirma };
            manifiesto.eventosFirma.push({ accion: "ENVIO_GENERADOR", fecha: fechaFirma, actorIdDeclarado: usuarioActorId, actorTipo: "UserExternal", identidadVerificada: true, responsables: [] });
        }

        manifiesto.estado = "ENVIADO";
        manifiesto.fechaEnvio = fechaFirma;
        manifiesto.observacion = "";
        manifiesto.historialRevision.push({ estado: "ENVIADO", origen: actorRol, fecha: fechaFirma, actorIdDeclarado: usuarioActorId });
        await manifiesto.save();
        let notificacionesPendientes = false;
        try {
            await NotificationService.send(io, {
                type: "SUBMODULE",
                title: `Manifiesto enviado: ${manifiesto.numeroManifiesto}`,
                message: `${actorRol === "GENERADOR" ? "El generador" : "El transportista"} envió el manifiesto ${manifiesto.numeroManifiesto} para revisión de Tower.`,
                creator: { id: usuarioActorId, model: "UserExternal" },
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
