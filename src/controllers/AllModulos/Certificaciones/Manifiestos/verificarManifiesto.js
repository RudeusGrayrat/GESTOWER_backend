const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Destino = require("../../../../models/AllModulos/Certificacion/Destino");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");
const snapshotFirma = require("../../../../utils/manifiestoFirmaSnapshot");

const verificarManifiesto = async (req, res) => {
    const { id } = req.params;
    const { estado, observaciones } = req.body;
    const usuarioId = req.user?._id || req.body.usuarioId;

    try {
        if (!id) return res.status(400).json({ message: "ID del manifiesto no proporcionado", type: "Error" });
        if (!["APROBADO", "OBSERVADO", "RECHAZADO"].includes(estado)) {
            return res.status(400).json({ message: "La decisión de revisión no es válida.", type: "Advertencia" });
        }
        if (["OBSERVADO", "RECHAZADO"].includes(estado) && !observaciones?.trim()) {
            return res.status(400).json({ message: "Indique el motivo de la observación o del rechazo.", type: "Advertencia" });
        }

        const manifiesto = await Manifiesto.findById(id);
        if (!manifiesto) return res.status(404).json({ message: "El manifiesto no existe en el sistema", type: "Error" });

        if (manifiesto.estado === "APROBADO" || manifiesto.estado === "RECHAZADO") {
            return res.status(400).json({ message: `Operación inválida. Este documento ya fue cerrado con estado: ${manifiesto.estado}`, type: "Advertencia" });
        }

        // PENDIENTE solo puede existir en documentos históricos del flujo que
        // requería aprobación del generador. Tower puede cerrarlos directamente.
        const puedeEvaluarDestino = ["ENVIADO", "EN REVISION", "PENDIENTE"].includes(manifiesto.estado);
        if (!puedeEvaluarDestino) {
            return res.status(400).json({ message: "Solo se puede evaluar un manifiesto enviado al destino. Si fue observado, debe corregirse y reenviarse.", type: "Advertencia" });
        }
        manifiesto.$where = { estado: manifiesto.estado };

        // La aprobación de Gestower completa los campos de recepción y devolución
        // con los primeros responsables que tengan una firma vigente registrada.
        if (estado === "APROBADO") {
            const [destino, transportista, generador] = await Promise.all([
                Destino.findById(manifiesto.destinoId),
                Transportista.findById(manifiesto.transportistaId),
                Generador.findById(manifiesto.generadorId),
            ]);
            const tieneFirma = (responsable) => typeof responsable.firmaResponsable === "string" && responsable.firmaResponsable.trim();
            const responsableDestino = destino?.responsables?.find(tieneFirma);
            const responsableTransportista = transportista?.responsables?.find(tieneFirma);
            const responsableGenerador = generador?.responsablesTecnicos?.find(tieneFirma);

            if (!responsableDestino || !responsableTransportista || !responsableGenerador) {
                return res.status(400).json({
                    message: "No se puede aprobar: destino, transportista y generador deben tener al menos un responsable con firma registrada.",
                    type: "Error"
                });
            }

            let firmaDestino, firmaTransportista, firmaGenerador;
            try {
                [firmaDestino, firmaTransportista, firmaGenerador] = await Promise.all([
                    snapshotFirma(responsableDestino.firmaResponsable),
                    snapshotFirma(responsableTransportista.firmaResponsable),
                    snapshotFirma(responsableGenerador.firmaResponsable),
                ]);
            } catch (error) {
                return res.status(400).json({ message: `No se pudieron conservar las firmas: ${error.message}`, type: "Advertencia" });
            }
            const ahora = new Date();
            const horaLima = ahora.toLocaleTimeString("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false });
            manifiesto.referendoRecepcion = {
                referendo: true,
                responsableEorsDestino: responsableDestino.nombre,
                // El esquema conserva este nombre histórico; aquí se almacena la firma del destino.
                firmaGenerador: firmaDestino,
                dniResponsableEorsDestino: responsableDestino.dni,
                cargoResponsableEorsDestino: responsableDestino.cargo,
                fechaReferendo: ahora,
                horaReferendo: horaLima,
            };
            manifiesto.otrasObligaciones = {
                representanteEors: responsableTransportista.nombre,
                cargoRepresentanteEors: responsableTransportista.cargo,
                dniRepresentanteEors: responsableTransportista.dni,
                firmaRepresentanteEors: firmaTransportista,
                generadorResponsableManejo: responsableGenerador.nombreResponsable,
                cargoGeneradorResponsableManejo: responsableGenerador.cargoResponsable,
                dniGeneradorResponsableManejo: responsableGenerador.dniResponsable,
                firmaGeneradorResponsableManejo: firmaGenerador,
                fecha: ahora,
                hora: horaLima,
            };
            manifiesto.eventosFirma.push({
                accion: "APROBACION_DESTINO",
                fecha: ahora,
                actorIdDeclarado: usuarioId,
                actorTipo: "Employee",
                identidadVerificada: !!req.user?._id,
                responsables: [
                    { rol: "DESTINO", nombre: responsableDestino.nombre, dni: responsableDestino.dni, cargo: responsableDestino.cargo, firma: firmaDestino },
                    { rol: "TRANSPORTISTA_DEVOLUCION", nombre: responsableTransportista.nombre, dni: responsableTransportista.dni, cargo: responsableTransportista.cargo, firma: firmaTransportista },
                    { rol: "GENERADOR_DEVOLUCION", nombre: responsableGenerador.nombreResponsable, dni: responsableGenerador.dniResponsable, cargo: responsableGenerador.cargoResponsable, firma: firmaGenerador },
                ],
            });
        }

        manifiesto.estado = estado;
        manifiesto.observacion = observaciones?.trim() || "";
        manifiesto.historialRevision.push({ estado, observacion: manifiesto.observacion, origen: "DESTINO", fecha: new Date(), actorIdDeclarado: usuarioId });

        if (estado === "APROBADO") {
            manifiesto.aprobadorPor = usuarioId;
        } else if (estado === "RECHAZADO") {
            manifiesto.rechazadoPor = usuarioId;
        } else if (estado === "OBSERVADO") {
            manifiesto.observadoPor = usuarioId;
        }

        await manifiesto.save();

        // La revisión se conserva aunque falle el envío de una notificación.
        let notificacionesPendientes = false;
        try {
            const destinatarios = [];
            if (manifiesto.transportistaId) destinatarios.push({ transportistaId: manifiesto.transportistaId, roles: "TRANSPORTISTA" });
            if (manifiesto.generadorId) destinatarios.push({ generadorId: manifiesto.generadorId, roles: "GENERADOR" });
            const usuarios = destinatarios.length
                ? await UserExternal.find({ estado: "ACTIVO", $or: destinatarios }).select("_id generadorId transportistaId roles").lean()
                : [];
            const texto = estado === "APROBADO"
                ? "ha sido aprobado por el destino. Puedes consultar el documento en ManifesTower."
                : estado === "OBSERVADO"
                    ? `ha sido observado por el destino. Motivo: ${manifiesto.observacion}`
                    : `ha sido rechazado por el destino. Motivo: ${manifiesto.observacion}`;
            const resultados = await Promise.allSettled(usuarios.map((usuario) => NotificationService.send(req.app.get("io"), {
                type: "INDIVIDUAL",
                title: `Manifiesto ${estado.toLowerCase()}: ${manifiesto.numeroManifiesto}`,
                message: `El manifiesto ${manifiesto.numeroManifiesto} ${texto}`,
                creator: { id: usuarioId, model: usuarioId ? "Employee" : "System" },
                scope: { receiverModel: "UserExternal", receiverId: usuario._id },
                entity: { id: manifiesto._id, model: "Manifiesto" },
            })));
            const hayGenerador = usuarios.some((usuario) => usuario.generadorId?.toString() === manifiesto.generadorId?.toString() && usuario.roles.includes("GENERADOR"));
            const hayTransportista = usuarios.some((usuario) => usuario.transportistaId?.toString() === manifiesto.transportistaId?.toString() && usuario.roles.includes("TRANSPORTISTA"));
            notificacionesPendientes = !hayGenerador || !hayTransportista || resultados.some((resultado) => resultado.status === "rejected");
        } catch (error) {
            notificacionesPendientes = true;
            console.error("No se pudieron enviar las notificaciones del manifiesto:", error);
        }

        // 6. Respuesta limpia adaptada a tu Hook de notificaciones
        let mensajeExito = `Manifiesto procesado con éxito como ${estado}.`;
        if (estado === "OBSERVADO") {
            mensajeExito = "El manifiesto ha sido devuelto al área correspondiente con las observaciones registradas.";
        }
        if (notificacionesPendientes) mensajeExito += " No fue posible notificar a todos los participantes; revise sus cuentas o el registro del servidor.";

        return res.status(200).json({
            message: mensajeExito,
            type: "Correcto",
            data: manifiesto,
            notificacionesPendientes,
        });
    } catch (error) {
        if (error.name === "DocumentNotFoundError") return res.status(409).json({ message: "El manifiesto cambió durante la revisión. Actualiza la lista.", type: "Advertencia" });
        console.error("Error crítico en verificarManifiesto:", error);
        return res.status(500).json({
            message: "Error interno del servidor al procesar las firmas y verificación del manifiesto",
            type: "Error"
        });
    }
};

module.exports = verificarManifiesto;
