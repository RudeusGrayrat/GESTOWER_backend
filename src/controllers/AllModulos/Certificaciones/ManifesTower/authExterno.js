const jwt = require("jsonwebtoken");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
module.exports = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
        const payload = token && jwt.verify(token, process.env.JWT_SECRET);
        if (!payload || payload.role !== "EXTERNAL" || !["GENERADOR", "TRANSPORTISTA"].includes(payload.activeRole)) return res.status(401).json({ message: "Inicia sesión nuevamente." });
        const user = await UserExternal.findById(payload._id);
        const empresa = payload.activeRole === "GENERADOR" ? user?.generadorId : user?.transportistaId;
        if (!user || user.estado !== "ACTIVO" || !user.roles.includes(payload.activeRole) || !empresa) return res.status(403).json({ message: "La cuenta no está habilitada para este rol." });
        req.externalUser = user;
        req.externalRole = payload.activeRole;
        next();
    } catch (_) { return res.status(401).json({ message: "La sesión no es válida o ha expirado." }); }
};
