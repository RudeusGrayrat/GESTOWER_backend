const Permisos = require("../../../../models/RecursosHumanos/Permisos");

const postPermiso = async (req, res) => {
    try {
        const {
            colaborador,
            fechaInicio,
            fechaFin,
            duracionHoras,
            tipo,
            motivo,
            conGoce,
            creadoPor
        } = req.body;

        if (!colaborador)
            return res.status(400).json({ message: "El colaborador es obligatorio", type: "Advertencia" });

        if (!fechaInicio)
            return res.status(400).json({ message: "La fecha de inicio es obligatoria", type: "Advertencia" });

        if (!fechaFin)
            return res.status(400).json({ message: "La fecha de fin es obligatoria", type: "Advertencia" });

        if (duracionHoras && duracionHoras < 0)
            return res.status(400).json({ message: "La duración en horas no puede ser negativa", type: "Advertencia" });

        if (!tipo)
            return res.status(400).json({ message: "El tipo de permiso es obligatorio", type: "Advertencia" });

        if (!creadoPor)
            return res.status(400).json({ message: "El usuario creador es obligatorio", type: "Advertencia" });

        const newPermiso = new Permisos({
            colaborador,
            fechaInicio,
            fechaFin,
            duracionHoras,
            tipo,
            motivo,
            conGoce,
            creadoPor,
            historial: [
                {
                    usuario: creadoPor,
                    accion: "CREADO"
                }
            ]
        });

        const savedPermiso = await newPermiso.save();

        return res.status(201).json({
            message: "Permiso creado correctamente",
            permiso: savedPermiso,
            type: "Correcto"
        });

    } catch (error) {
        return res.status(500).json({ message: error.message, type: "Error" });
    }
};

module.exports = postPermiso;