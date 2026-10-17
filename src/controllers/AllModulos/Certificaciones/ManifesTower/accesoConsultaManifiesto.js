const jwt = require("jsonwebtoken");
const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const externo = require("./authExterno");
const tokenVerify = require("../../../auth/midellware");
const autenticar = (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
    let payload;
    try { if (token) payload = jwt.verify(token, process.env.JWT_SECRET); } catch (_) { /* El middleware interno rechazará el token inválido. */ }
    return payload?.role === "EXTERNAL" ? externo(req, res, next) : tokenVerify(req, res, next);
};
const permiso = (req, res, next) => {
    if (req.externalUser) return next();
    if (!req.user?._id || req.user.state !== "ACTIVO") return res.status(403).json({ message: "Se requiere un empleado activo identificado." });
    if (!(req.user.modules || []).some((m) => m.submodule?.name?.toUpperCase() === "MANIFIESTOS" && (m.submodule.permissions || []).includes("VER"))) return res.status(403).json({ message: "Se requiere el permiso VER de MANIFIESTOS." });
    next();
};
const filtrar = (req, res, next) => {
    if (req.externalUser) { req.query.usuario = String(req.externalUser._id); req.query.rolActivo = req.externalRole; }
    else { delete req.query.usuario; delete req.query.rolActivo; }
    next();
};
const documento = async (req, res, next) => {
    if (!req.externalUser) return next();
    try {
        const doc = await Manifiesto.findById(req.params.id).select("generadorId transportistaId estado").lean();
        if (!doc) return res.status(404).json({ message: "Manifiesto no encontrado." });
        const propio = req.externalRole === "GENERADOR" ? String(doc.generadorId) === String(req.externalUser.generadorId) && doc.estado !== "BORRADOR" : String(doc.transportistaId) === String(req.externalUser.transportistaId);
        if (!propio) return res.status(403).json({ message: "No tienes acceso a este manifiesto." });
        next();
    } catch (_) { return res.status(400).json({ message: "Identificador de manifiesto inválido." }); }
};
module.exports = { autenticar, permiso, filtrar, documento };
