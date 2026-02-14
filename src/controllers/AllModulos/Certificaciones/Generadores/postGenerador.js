const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");

const postGenerador = async (req, res) => {
    try {
        const {
            razonSocial,
            ruc,
            correoElectronico,
            direccion,
            telefono,
            representanteLegal,
            dniRepresentante,
            estado
        } = req.body;

        if (!razonSocial || !ruc || !correoElectronico || !direccion || !telefono || !representanteLegal || !dniRepresentante) {
            return res.status(400).json({
                message: "Faltan datos requeridos para crear el generador",
            });
        }

        const findGenerador = await Generador.findOne({ ruc });
        if (findGenerador) {
            return res.status(400).json({
                message: "El generador con este RUC ya existe",
            });
        }

        const newGenerador = new Generador({
            razonSocial,
            ruc,
            correoElectronico,
            direccion,
            telefono,
            representanteLegal,
            dniRepresentante,
            estado: estado || "ACTIVO",
        });

        await newGenerador.save();
        return res.status(201).json({
            message: "Generador creado exitosamente",
            data: newGenerador
        });
    } catch (error) {
        return res.status(500).json({
            message: error.message || "Error al crear el generador",
        });
    }
};

module.exports = postGenerador;