// postUbigeosBatch.js
const Ubigeo = require("../../../../models/AllModulos/Certificacion/Ubigeo");

const postUbigeosBatch = async (req, res) => {
    try {
        const { ubigeos } = req.body;

        // Validar que sea array
        if (!ubigeos || !Array.isArray(ubigeos)) {
            return res.status(400).json({
                message: "Se requiere un array de ubigeos",
                type: "Error"
            });
        }

        const resultados = [];
        const exitosos = [];

        for (const item of ubigeos) {
            try {
                // Verificar si ya existe
                const existe = await Ubigeo.findOne({ codigo: item.codigo });
                if (existe) {
                    resultados.push({
                        codigo: item.codigo,
                        success: false,
                        error: "Código ya existe"
                    });
                    continue;
                }

                // Crear nuevo
                const newUbigeo = new Ubigeo(item);
                await newUbigeo.save();

                exitosos.push(item.codigo);
                resultados.push({
                    codigo: item.codigo,
                    success: true
                });

            } catch (err) {
                resultados.push({
                    codigo: item.codigo,
                    success: false,
                    error: err.message
                });
            }
        }

        return res.status(200).json({
            message: `Procesados ${ubigeos.length} registros. Exitosos: ${exitosos.length}`,
            resultados,
            type: "Correcto"
        });

    } catch (error) {
        console.error("Error en postUbigeosBatch:", error);
        return res.status(500).json({
            message: error.message,
            type: "Error"
        });
    }
};

module.exports = postUbigeosBatch;