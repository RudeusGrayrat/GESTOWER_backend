const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const NotificationService = require("../../../Herramientas/Notification/CreateNotification");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");

const patchVinculacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { accion, usuarioId, rolActivo, tienePermisoLlenado } = req.query;
        const io = req.app.get("io");

        if (!usuarioId) {
            return res.status(400).json({ message: 'El ID del usuario que responde es requerido.', type: 'Alerta' });
        }

        const accionesValidas = ['ACEPTAR', 'RECHAZAR', 'CANCELAR', 'TOGGLE_PERMISO'];
        if (!accionesValidas.includes(accion)) {
            return res.status(400).json({ message: 'Acción no válida.', type: 'Alerta' });
        }

        const queryStatus = ['CANCELAR', 'TOGGLE_PERMISO'].includes(accion) ? 'ACEPTADA' : 'PENDIENTE';
        const vinculacion = await Vinculacion.findOne({ _id: id, status: queryStatus });

        if (!vinculacion) {
            return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada por la contraparte.', type: 'Alerta' });
        }

        const permisoBool = tienePermisoLlenado === 'true' || tienePermisoLlenado === true;

        // ==========================================
        // CASO 1: ACEPTAR SOLICITUD
        // ==========================================
        if (accion === 'ACEPTAR') {
            vinculacion.status = 'ACEPTADA';
            vinculacion.fechaRespuesta = new Date();
            vinculacion.respondidoPor = usuarioId;

            const esGeneradorRespondiendo = vinculacion.iniciadoPor === 'TRANSPORTISTA';
            const permisoFinal = esGeneradorRespondiendo ? permisoBool : false;

            vinculacion.tienePermisoLlenado = permisoFinal;
            await vinculacion.save();

            await Transportista.findByIdAndUpdate(vinculacion.transportistaId, {
                $addToSet: {
                    generadores: {
                        generadorId: vinculacion.generadorId,
                        tienePermisoLlenado: permisoFinal
                    }
                }
            });

            // ==========================================
            // CASO 2: RECHAZAR SOLICITUD
            // ==========================================
        } else if (accion === 'RECHAZAR') {
            vinculacion.status = 'RECHAZADA';
            vinculacion.fechaRespuesta = new Date();
            vinculacion.respondidoPor = usuarioId;
            await vinculacion.save();

            // ==========================================
            // CASO 3: CANCELAR VINCULACIÓN
            // ==========================================
        } else if (accion === 'CANCELAR') {
            vinculacion.status = 'RECHAZADA'; // O el estado de historial que manejes para bajas
            vinculacion.fechaRespuesta = new Date();
            vinculacion.respondidoPor = usuarioId;
            await vinculacion.save();

            await Transportista.findByIdAndUpdate(vinculacion.transportistaId, {
                $pull: {
                    generadores: { generadorId: vinculacion.generadorId }
                }
            });

            // ==========================================
            // CASO 4: SWITCH EN CALIENTE (MUTACIÓN DE PERMISO)
            // ==========================================
        } else if (accion === 'TOGGLE_PERMISO') {
            if (rolActivo !== "GENERADOR") {
                return res.status(403).json({
                    message: 'Acceso Denegado. Solo el cliente Generador posee la potestad de autorizar o revocar el uso de sus datos fiscales.',
                    type: 'Alerta'
                });
            }

            vinculacion.tienePermisoLlenado = permisoBool;
            await vinculacion.save();

            await Transportista.updateOne(
                { _id: vinculacion.transportistaId, "generadores.generadorId": vinculacion.generadorId },
                { $set: { "generadores.$.tienePermisoLlenado": permisoBool } }
            );
        }

        // ==========================================
        // 🔔 🌟 SISTEMA DE NOTIFICACIONES DINÁMICO
        // ==========================================
        try {
            // 1. Buscamos y poblamos al usuario que ejecuta la acción para saber quién es
            const usuarioRespondedor = await UserExternal.findById(usuarioId)
                .populate("generadorId", "razonSocial ruc")
                .populate("transportistaId", "razonSocial ruc");

            if (usuarioRespondedor) {
                // Identificamos los datos fiscales de quien opera en el backend
                const razonRespondedor = rolActivo === "GENERADOR"
                    ? usuarioRespondedor.generadorId?.razonSocial
                    : usuarioRespondedor.transportistaId?.razonSocial;

                const rucRespondedor = rolActivo === "GENERADOR"
                    ? usuarioRespondedor.generadorId?.ruc
                    : usuarioRespondedor.transportistaId?.ruc;

                // 2. Determinamos el usuario destino (la contraparte que debe recibir la alerta)
                // Si el que operó es GENERADOR, le llega al TRANSPORTISTA, y viceversa.
                const queryDestino = rolActivo === "GENERADOR"
                    ? { transportistaId: vinculacion.transportistaId, roles: "TRANSPORTISTA" }
                    : { generadorId: vinculacion.generadorId, roles: "GENERADOR" };

                const usuarioDestino = await UserExternal.findOne(queryDestino);

                if (usuarioDestino) {
                    let title = "";
                    let message = "";

                    // Construcción de strings personalizados según la acción real ejecutada
                    if (accion === 'ACEPTAR') {
                        title = "Solicitud de Vinculación Aceptada";
                        message = `Tu solicitud de vinculación de operaciones fue aceptada por la empresa: ${razonRespondedor} - RUC: ${rucRespondedor}. Ya pueden operar juntos.`;
                    } else if (accion === 'RECHAZAR') {
                        title = "Solicitud de Vinculación Rechazada";
                        message = `Tu solicitud de vinculación de operaciones fue rechazada por la empresa: ${razonRespondedor} - RUC: ${rucRespondedor}.`;
                    } else if (accion === 'CANCELAR') {
                        title = "Vinculación Operativa Finalizada";
                        message = `La empresa ${razonRespondedor} (RUC: ${rucRespondedor}) ha cancelado la vinculación operacional que mantenían activa.`;
                    } else if (accion === 'TOGGLE_PERMISO') {
                        title = "Modificación de Permisos de Llenado";
                        message = `La empresa ${razonRespondedor} ha ${permisoBool ? 'CONCEDIDO' : 'REVOCADO'} el permiso para que gestiones de forma directa el llenado de Manifiestos con sus datos fiscales.`;
                    }

                    // Si la acción requiere despacho de notificación, la enviamos
                    if (title && message) {
                        await NotificationService.send(io, {
                            type: "INDIVIDUAL",
                            title,
                            message,
                            creator: {
                                id: usuarioId,
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
                }
            }
        } catch (notifError) {
            // Un error en el servicio de sockets o grabado de notificaciones no debe romper la transacción exitosa de la DB principal
            console.error("⚠️ Error silencioso al despachar notificación en patchVinculacion:", notifError);
        }

        // Retorno de respuesta HTTP exitosa
        return res.status(200).json({
            message: `Operación (${accion}) completada con éxito.`,
            type: 'Correcto',
            data: vinculacion
        });

    } catch (error) {
        console.error('Error al responder vinculación:', error);
        return res.status(500).json({ message: 'Error interno del servidor.', type: 'Error' });
    }
};

module.exports = patchVinculacion;