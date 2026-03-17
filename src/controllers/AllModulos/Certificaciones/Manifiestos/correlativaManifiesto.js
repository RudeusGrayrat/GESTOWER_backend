const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");


const generarCorrelativaManifiesto = async (año) => {
    try {
        // Prefijo fijo "MRSP-" más el año
        const prefijo = `MRSP-${año}-`;

        // Buscar el último manifiesto del año
        const ultimoManifiesto = await Manifiesto.findOne({
            numeroManifiesto: { $regex: `^${prefijo}` }
        })
            .sort({ numeroManifiesto: -1 })
            .limit(1);

        let nuevoNumero = 1;
        if (ultimoManifiesto) {
            const ultimoNumero = parseInt(ultimoManifiesto.numeroManifiesto.replace(prefijo, ''), 10);
            if (!isNaN(ultimoNumero)) {
                nuevoNumero = ultimoNumero + 1;
            }
        }

        // Formato: MRSP-2025-00001
        return `${prefijo}${nuevoNumero.toString().padStart(5, '0')}`;
    } catch (error) {
        console.error("Error al generar correlativa de manifiesto:", error);
        throw new Error("No se pudo generar el número de manifiesto");
    }
};

module.exports = generarCorrelativaManifiesto;