const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const mongoose = require("mongoose");

const getTransportistaById = async (req, res) => {
    try {
        const { id } = req.params; // ID del Transportista
        const { usuario } = req.query; // ID del Usuario logueado (Opcional)

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID de transportista no válido" });
        }

        // Buscamos el transportista con sus poblaciones requeridas
        const transportista = await Transportista.findById(id)
            .populate("ubigeoId")
            .populate("generadores.generadorId")
            .lean();

        if (!transportista) {
            return res.status(404).json({ message: "Transportista no encontrado" });
        }

        // Si se envió el ID de usuario, buscamos su vinculación específica para aplanar la respuesta
        if (usuario && mongoose.Types.ObjectId.isValid(usuario)) {
            const cuentaUsuario = await UserExternal.findById(usuario);

            if (cuentaUsuario && cuentaUsuario.generadorId) {
                const filtroGeneradorId = cuentaUsuario.generadorId.toString();

                // Buscamos la relación exacta dentro del array del transportista
                const vinculacion = transportista.generadores?.find(
                    (g) => g.generadorId?._id?.toString() === filtroGeneradorId || g.generadorId?.toString() === filtroGeneradorId
                );

                // Si existe la vinculación, inyectamos las propiedades en la raíz
                return res.json({
                    ...transportista,
                    status: vinculacion?.status || "PENDIENTE",
                    tienePermisoLlenado: vinculacion?.tienePermisoLlenado || false,
                    fechaDesvinculacion: vinculacion?.fechaDesvinculacion || null,
                    desvinculadoPor: vinculacion?.desvinculadoPor || null,
                });
            }
        }
        console.log("No se encontró usuario o no es un generador, devolviendo transportista completo sin aplanar.", { transportista, usuario });
        // Si no se envía usuario o no es un generador, devuelve el objeto tal cual está en la BD
        return res.json(transportista);

    } catch (error) {
        console.error("Error fetching transportista by ID:", error);
        return res.status(500).json({ message: error.message || "Error al obtener el transportista" });
    }
};

module.exports = getTransportistaById;