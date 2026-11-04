const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");

const deleteGenerador = async (req, res) => {
    try {
        const generador = await Generador.findById(req.params.id);
        if (!generador) return res.status(404).json({ message: "Generador no encontrado." });

        // Un manifiesto es un documento operativo/auditable; nunca se borra en
        // cascada al eliminar una empresa.
        if (await Manifiesto.exists({ generadorId: generador._id })) {
            return res.status(409).json({ message: "No se puede eliminar el generador porque tiene manifiestos asociados." });
        }

        await Promise.all([
            Transportista.updateMany({}, { $pull: { generadores: { generadorId: generador._id } } }),
            Vinculacion.deleteMany({ generadorId: generador._id }),
            UserExternal.deleteMany({ generadorId: generador._id }),
            generador.deleteOne(),
        ]);
        return res.json({ message: "Generador eliminado correctamente." });
    } catch (error) {
        return res.status(400).json({ message: error.message || "No se pudo eliminar el generador." });
    }
};

module.exports = deleteGenerador;
