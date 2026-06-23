const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");

const patchVinculacion = async (req, res) => {
    try {
        const { id } = req.params;
        const { accion, transportistaId } = req.query
        if (!['ACEPTAR', 'RECHAZAR'].includes(accion)) {
            return res.status(400).json({ message: 'Acción no válida.', type: 'Alerta' });
        }

        // Buscar la solicitud asegurando que pertenezca a este transportista y esté PENDIENTE
        const vinculacion = await Vinculacion.findOne({
            _id: id,
            transportistaId,
            status: 'PENDIENTE'
        });

        if (!vinculacion) {
            return res.status(404).json({ message: 'Solicitud no encontrada o ya procesada.', type: 'Alerta' });
        }

        // Mutar estado quirúrgicamente
        vinculacion.status = accion === 'ACEPTAR' ? 'ACEPTADA' : 'RECHAZA';
        vinculacion.fechaRespuesta = new Date();
        vinculacion.respondidoPor = req.user.id; // ID del usuario físico que dio clic

        await vinculacion.save();

        return res.status(200).json({
            message: `Solicitud ${accion === 'ACEPTAR' ? 'aceptada' : 'rechazada'} con éxito.`,
            type: 'Correcto',
            data: vinculacion
        });

    } catch (error) {
        console.error('Error al responder vinculación:', error);
        return res.status(500).json({ message: 'Error interno del servidor.', type: 'Error' });
    }
};

module.exports = patchVinculacion;