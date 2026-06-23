const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");

const postVinvulacion = async (req, res) => {
    try {
        const { transportistaId, generadorId } = req.query

        if (!transportistaId) {
            return res.status(400).json({ message: 'El ID del transportista es requerido.', type: 'Alerta' });
        }

        // 2. Validar si ya existe una relación previa que no haya sido rechazada/cancelada
        const relacionExistente = await Vinculacion.findOne({
            generadorId,
            transportistaId,
            status: { $in: ['PENDIENTE', 'ACEPTADA'] }
        });

        if (relacionExistente) {
            const msg = relacionExistente.status === 'PENDIENTE'
                ? 'Ya existe una solicitud pendiente con esta empresa.'
                : 'Ya te encuentras vinculado de forma activa con esta empresa.';
            return res.status(400).json({ message: msg, type: 'Alerta' });
        }

        // 3. Crear el registro de vinculación en estado PENDIENTE
        const nuevaVinculacion = new Vinculacion({
            generadorId,
            transportistaId,
            iniciadoPor: 'GENERADOR', // Lo inició el componente que acabas de hacer
            status: 'PENDIENTE'
        });

        await nuevaVinculacion.save();

        // 4. [OPCIONAL] Emitir evento en tiempo real por Socket.io si el transportista está conectado
        // io.to(`ROOM_COMPANY_${transportistaId}`).emit('nueva_solicitud_vinculacion', nuevaVinculacion);

        return res.status(201).json({
            message: 'Solicitud de vinculación procesada correctamente.',
            type: 'Correcto',
            data: nuevaVinculacion
        });

    } catch (error) {
        console.error('Error en solicitudVinculacion:', error);
        return res.status(500).json({ message: 'Error interno del servidor.', type: 'Error' });
    }
}

module.exports = postVinvulacion;