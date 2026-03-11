const Permisos = require("../../../../models/RecursosHumanos/Permisos");

const patchPermiso = async (req, res) => {
    const {
        _id,
        fechaInicio,
        fechaFin,
        tipo,
        motivo,
        conGoce,
        estado,
        aprobadoPor
    } = req.body;

    try {

        const permiso = await Permisos.findById(_id);

        if (!permiso) {
            return res.status(404).json({ message: "Permiso no encontrado" });
        }

        if (fechaInicio) permiso.fechaInicio = fechaInicio;
        if (fechaFin) permiso.fechaFin = fechaFin;
        if (tipo) permiso.tipo = tipo;
        if (motivo) permiso.motivo = motivo;
        if (conGoce !== undefined) permiso.conGoce = conGoce;

        if (estado) {
            permiso.estado = estado;

            permiso.historial.push({
                usuario: aprobadoPor,
                accion: estado
            });
        }

        if (aprobadoPor) permiso.aprobadoPor = aprobadoPor;

        await permiso.save();

        return res.status(200).json({
            message: "Permiso actualizado correctamente",
            permiso,
            type: "Correcto"
        });

    } catch (error) {
        return res.status(500).json({ message: error.message, type: "Error" });
    }
};

module.exports = patchPermiso;