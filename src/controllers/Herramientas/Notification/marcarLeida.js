// controllers/Herramientas/Notification/NotificacionLeida.js
const Notification = require("../../../models/Herramientas/Notification/Notificacion");

const NotificacionLeida = async (req, res) => {
    try {
        const { id } = req.params;   // ID de la notificación enviado por la URL
        const { userId } = req.body; // ID del usuario enviado en el body

        if (!id || !userId) {
            return res.status(400).json({ ok: false, message: "Faltan parámetros requeridos (id o userId)." });
        }

        const notificacion = await Notification.findById(id);

        if (!notificacion) {
            return res.status(404).json({ ok: false, message: "Notificación no encontrada." });
        }

        // Aplicamos la mutación lógica según el tipo de notificación
        if (notificacion.type === "INDIVIDUAL") {
            notificacion.isReadIndividual = true;
        } else {
            // 🔥 CORRECCIÓN: Buscamos dentro del objeto usando .some() y comparando strings
            const yaLeida = notificacion.readBy.some(
                (read) => read.userId && read.userId.toString() === userId.toString()
            );

            // 🔥 CORRECCIÓN: Insertamos el objeto respetando el esquema de la DB
            if (!yaLeida) {
                notificacion.readBy.push({
                    userId: userId,
                    readAt: new Date()
                });
            }
        }

        await notificacion.save();

        return res.status(200).json({
            ok: true,
            message: "Notificación marcada como leída correctamente."
        });

    } catch (error) {
        console.error("Error al marcar notificación como leída:", error);
        return res.status(500).json({ ok: false, message: "Error interno del servidor al procesar la lectura." });
    }
};

module.exports = NotificacionLeida;