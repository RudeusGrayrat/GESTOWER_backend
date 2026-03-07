const HorasExtras = require("../../../../models/RecursosHumanos/HorasExtras");

const patchHorasExtras = async (req, res) => {

    const {
        _id,
        fecha,
        horas,
        motivo,
        estado,
        aprobadoPor
    } = req.body;

    try {

        const horasExtras = await HorasExtras.findById(_id);

        if (!horasExtras) {
            return res.status(404).json({ message: "Registro no encontrado" });
        }

        if (fecha) horasExtras.fecha = fecha;
        if (horas) horasExtras.horas = horas;
        if (motivo) horasExtras.motivo = motivo;

        if (estado) horasExtras.estado = estado;
        if (aprobadoPor) horasExtras.aprobadoPor = aprobadoPor;

        await horasExtras.save();

        return res.status(200).json({
            message: "Horas extras actualizadas correctamente",
            horasExtras
        });

    } catch (error) {

        return res.status(500).json({ message: error.message });

    }
};

module.exports = patchHorasExtras;