const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");
const permiso = (operacion, externoPermitido) => (req, res, next) => {
    if (req.externalUser) return externoPermitido && req.externalRole === "TRANSPORTISTA" ? next() : res.status(403).json({ message: "No tienes permiso para esta operación." });
    if (!req.user?._id || req.user.state !== "ACTIVO") return res.status(403).json({ message: "Se requiere un empleado activo identificado." });
    const ok = (req.user.modules || []).some((m) => m.submodule?.name?.toUpperCase() === "MANIFIESTOS" && (m.submodule.permissions || []).includes(operacion));
    if (!ok) return res.status(403).json({ message: `Se requiere el permiso ${operacion} de MANIFIESTOS.` });
    next();
};
const crear = async (req, res, next) => {
    if (!req.externalUser) return next();
    try {
        if (String(req.body.transportistaId) !== String(req.externalUser.transportistaId)) return res.status(403).json({ message: "Solo puedes crear manifiestos para tu empresa." });
        if (!await Vinculacion.exists({ generadorId: req.body.generadorId, transportistaId: req.externalUser.transportistaId, status: "ACEPTADA", fechaDesvinculacion: null })) return res.status(403).json({ message: "Se requiere una vinculación activa con el generador." });
        next();
    } catch (_) { return res.status(400).json({ message: "No se pudo validar la vinculación." }); }
};
const editar = async (req, res, next) => {
    if (!req.externalUser) return next();
    try {
        const doc = await Manifiesto.findById(req.params.manifiestoId).select("generadorId transportistaId").lean();
        if (!doc) return res.status(404).json({ message: "Manifiesto no encontrado." });
        if (String(doc.transportistaId) !== String(req.externalUser.transportistaId) || (req.body.transportistaId && String(req.body.transportistaId) !== String(req.externalUser.transportistaId))) return res.status(403).json({ message: "Solo el transportista propietario puede editar el manifiesto." });
        if (!await Vinculacion.exists({ generadorId: req.body.generadorId || doc.generadorId, transportistaId: req.externalUser.transportistaId, status: "ACEPTADA", fechaDesvinculacion: null })) return res.status(403).json({ message: "Se requiere una vinculación activa con el generador." });
        next();
    } catch (_) { return res.status(400).json({ message: "No se pudo validar el manifiesto." }); }
};
module.exports = { permiso, crear, editar };
