const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
module.exports = (rol) => async (req, res, next) => {
    try {
        if (req.externalRole !== rol) return res.status(403).json({ message: "No tienes el rol necesario." });
        const manifiesto = await Manifiesto.findById(req.params.id).select("generadorId transportistaId").lean();
        if (!manifiesto) return res.status(404).json({ message: "Manifiesto no encontrado." });
        const propio = rol === "GENERADOR" ? String(manifiesto.generadorId) === String(req.externalUser.generadorId) : String(manifiesto.transportistaId) === String(req.externalUser.transportistaId);
        if (!propio) return res.status(403).json({ message: "No tienes acceso a este manifiesto." });
        req.user = { _id: req.externalUser._id };
        req.query.usuarioId = String(req.externalUser._id);
        req.body = req.body || {};
        req.body.usuarioId = String(req.externalUser._id);
        return next();
    } catch (_) { return res.status(400).json({ message: "No se pudo validar el manifiesto." }); }
};
