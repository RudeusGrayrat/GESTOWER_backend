const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");

const deleteTransportista = async (req, res) => {
    try {
        const transportista = await Transportista.findById(req.params.id);
        if (!transportista) return res.status(404).json({ message: "Transportista no encontrado." });
        if (await Manifiesto.exists({ transportistaId: transportista._id })) {
            return res.status(409).json({ message: "No se puede eliminar el transportista porque tiene manifiestos asociados." });
        }

        await Promise.all([
            Vinculacion.deleteMany({ transportistaId: transportista._id }),
            UserExternal.deleteMany({ transportistaId: transportista._id }),
            transportista.deleteOne(),
        ]);
        return res.json({ message: "Transportista eliminado correctamente." });
    } catch (error) {
        return res.status(400).json({ message: error.message || "No se pudo eliminar el transportista." });
    }
};

module.exports = deleteTransportista;
