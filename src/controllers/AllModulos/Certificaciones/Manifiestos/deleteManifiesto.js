const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");

const deleteManifiesto = async (req, res) => {
    try {
        const manifiesto = await Manifiesto.findById(req.params.id);
        if (!manifiesto) return res.status(404).json({ message: "Manifiesto no encontrado." });
        if (["ENVIADO", "EN REVISION", "APROBADO"].includes(manifiesto.estado)) {
            return res.status(409).json({ message: "No se puede eliminar un manifiesto enviado, en revisión o aprobado." });
        }
        await manifiesto.deleteOne();
        return res.json({ message: "Manifiesto eliminado correctamente." });
    } catch (error) {
        return res.status(400).json({ message: error.message || "No se pudo eliminar el manifiesto." });
    }
};

module.exports = deleteManifiesto;
