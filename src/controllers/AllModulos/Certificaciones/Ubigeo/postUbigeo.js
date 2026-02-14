const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");

const postUbigeo = async (req, res) => {
    try {
        const { codigo, departamento, provincia, distrito, regionNatural, estado } = req.body;

        // Validaciones mejoradas
        if (!codigo || !departamento || !provincia || !distrito) {
            return res.status(400).json({
                message: "Faltan datos requeridos: código, departamento, provincia y distrito son obligatorios",
                type: "Error"
            });
        }

        // Validar formato del código (6 dígitos)
        if (!/^\d{6}$/.test(codigo)) {
            return res.status(400).json({
                message: "El código debe tener exactamente 6 dígitos numéricos",
                type: "Error"
            });
        }

        // Normalizar texto a mayúsculas
        const ubigeoData = {
            codigo,
            departamento: departamento.toUpperCase().trim(),
            provincia: provincia.toUpperCase().trim(),
            distrito: distrito.toUpperCase().trim(),
            regionNatural: regionNatural ? regionNatural.toUpperCase().trim() : "",
            estado: estado || "ACTIVO"
        };

        // Verificar si ya existe
        const findUbigeo = await Ubigeo.findOne({ codigo });
        if (findUbigeo) {
            return res.status(400).json({
                message: `El código ${codigo} ya está registrado`,
                type: "Error"
            });
        }

        const newUbigeo = new Ubigeo(ubigeoData);
        await newUbigeo.save();

        return res.status(201).json({
            message: "Ubigeo creado exitosamente",
            data: newUbigeo,
            type: "Correcto"
        });

    } catch (error) {
        console.error("Error en postUbigeo:", error);
        return res.status(500).json({
            message: error.message || "Error al crear el ubigeo",
            type: "Error"
        });
    }
};

module.exports = postUbigeo;