const HorasExtras = require("../../../../models/RecursosHumanos/HorasExtras");

const postHorasExtras = async (req, res) => {
    try {
        const {
            colaborador,
            fecha,
            horas,
            minutos,
            minutosTotales,
            motivo,
            creadoPor,
        } = req.body;

        if (!colaborador)
            return res.status(400).json({
                message: "El colaborador es obligatorio",
                type: "Advertencia"
            });

        if (!fecha)
            return res.status(400).json({ message: "La fecha es obligatoria", type: "Advertencia" });

        if (!minutosTotales)
            return res.status(400).json({ message: "Los minutos totales son obligatorios", type: "Advertencia" });

        if (!creadoPor) {
            return res.status(400).json({ message: "El usuario creador es obligatorio", type: "Advertencia" });
        }

        const findHorasExtras = await HorasExtras.findOne({ colaborador, fecha });
        console.log("findHorasExtras", findHorasExtras);

        if (findHorasExtras) {
            return res.status(400).json({
                message: "Ya existe un registro de horas extras para este colaborador en la fecha indicada",
                type: "Advertencia"
            });
        }
        const newHorasExtras = new HorasExtras({
            colaborador,
            fecha,
            horas,
            minutos,
            minutosTotales,
            motivo,
            creadoPor,
        });

        const savedHorasExtras = await newHorasExtras.save();

        return res.status(201).json({
            message: "Horas extras registradas correctamente",
            horasExtras: savedHorasExtras,
            type: "Correcto"
        });

    } catch (error) {
        return res.status(500).json({ message: error.message, type: "Error" });
    }
};

module.exports = postHorasExtras;