const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");

const enviarManifiesto = async (req, res) => {
    try {
        const { id } = req.params;
        const io = req.app.get("io");
        const usuarioTransportistaId = req.user?._id;

        const manifiesto = await Manifiesto.findById(id)
            .populate("generadorId", "razonSocial ruc")
            .populate("transportistaId", "razonSocial ruc");

        if (!manifiesto) {
            return res.status(404).json({ message: "El manifiesto solicitado no existe.", type: "Alerta" });
        }

        if (manifiesto.estado !== "BORRADOR" && manifiesto.estado !== "OBSERVADO") {
            return res.status(400).json({ message: "Solo se pueden enviar manifiestos en estado BORRADOR u OBSERVADO.", type: "Alerta" });
        }

        // ==========================================
        // 🛡️ VALIDACIÓN DE FIRMA DEL TRANSPORTISTA
        // ==========================================
        const perfilTransportista = await Transportista.findById(manifiesto.transportistaId?._id || manifiesto.transportistaId);
        const tieneFirmaTransportista = perfilTransportista?.responsables?.some(
            (resp) => resp.firmaResponsable && resp.firmaResponsable.trim() !== ""
        );

        if (!tieneFirmaTransportista) {
            return res.status(400).json({
                message: "No puedes enviar este manifiesto. Tu empresa de transportes no tiene ninguna firma de responsable registrada en el sistema.",
                type: "Alerta"
            });
        }
        // ==========================================

        const alianzasB2B = await Vinculacion.findOne({
            generadorId: manifiesto.generadorId?._id || manifiesto.generadorId,
            transportistaId: manifiesto.transportistaId?._id || manifiesto.transportistaId,
            status: "ACEPTADA"
        });
        if (!alianzasB2B) {
            return res.status(400).json({
                message: "No existe una vinculación comercial activa y aprobada con este Generador para procesar el envío.",
                type: "Alerta"
            });
        }

        // =================================================================
        // CAMINO A: POSEE PERMISO DE LLENADO AUTOMÁTICO (Va directo a Tower)
        // =================================================================
        if (alianzasB2B.tienePermisoLlenado === true) {
            manifiesto.estado = "ENVIADO";
            manifiesto.fechaEnvio = new Date(); // Si manejas este tracking
            await manifiesto.save();

            // 🔔 NOTIFICACIÓN ERP INTERNO (Submódulo MANIFIESTOS en OPERACIONES)
            try {
                await NotificationService.send(io, {
                    type: "SUBMODULE",
                    title: `Nuevo Manifiesto Recibido: ${manifiesto.numeroManifiesto}`,
                    message: `El transportista ${manifiesto.transportistaId?.razonSocial} ha enviado un manifiesto del generador ${manifiesto.generadorId?.razonSocial} para su revisión.`,
                    creator: {
                        id: usuarioTransportistaId,
                        model: "UserExternal"
                    },
                    scope: {
                        submoduleName: "MANIFIESTOS",
                        moduleName: "OPERACIONES"
                    },
                    entity: {
                        id: manifiesto._id,
                        model: "Manifiesto"
                    }
                });
            } catch (errNotif) {
                console.error("⚠️ Error silencioso al notificar al ERP:", errNotif);
            }

            return res.status(200).json({
                message: "Manifiesto despachado directamente hacia Tower (Destino).",
                type: "Correcto",
                estado: "ENVIADO",
                data: manifiesto
            });
        }

        else {
            manifiesto.estado = "PENDIENTE";
            await manifiesto.save();

            // Buscar el usuario administrador/operador del Generador en ManifesTower para enviarle la alerta individual
            const usuarioClienteDestino = await UserExternal.findOne({
                generadorId: manifiesto.generadorId?._id || manifiesto.generadorId,
                roles: "GENERADOR"
            });

            if (usuarioClienteDestino) {
                // 🔔 NOTIFICACIÓN INDIVIDUAL AL GENERADOR EN MANIFESTOWER
                try {
                    await NotificationService.send(io, {
                        type: "INDIVIDUAL",
                        title: "Firma de Manifiesto Pendiente",
                        message: `El transportista ${manifiesto.transportistaId?.razonSocial} ha creado el manifiesto ${manifiesto.numeroManifiesto}. Requiere tu revisión y firma para poder ser enviado a Tower.`,
                        creator: {
                            id: usuarioTransportistaId,
                            model: "UserExternal"
                        },
                        scope: {
                            receiverModel: "UserExternal",
                            receiverId: usuarioClienteDestino._id
                        },
                        entity: {
                            id: manifiesto._id,
                            model: "Manifiesto"
                        }
                    });
                } catch (errNotif) {
                    console.error("⚠️ Error silencioso al notificar de forma individual al Generador:", errNotif);
                }
            }

            return res.status(200).json({
                message: "Manifiesto guardado como PENDIENTE. Se ha enviado una solicitud de firma digital a tu cliente.",
                type: "Correcto",
                estado: "PENDIENTE",
                data: manifiesto
            });
        }

    } catch (error) {
        console.error("❌ Error catastrófico en enviarManifiesto:", error);
        return res.status(500).json({ message: "Error interno del servidor al procesar el envío.", type: "Error" });
    }
};

module.exports = enviarManifiesto;