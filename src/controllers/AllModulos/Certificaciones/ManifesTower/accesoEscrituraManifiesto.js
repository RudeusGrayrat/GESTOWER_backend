const Manifiesto = require("../../../../models/AllModulos/Certificacion/Manifiestos");
const Vinculacion = require("../../../../models/ManifesTower/Vinculacion");
const permiso = (operacion, externoPermitido) => (req, res, next) => {
    if (req.externalUser) return externoPermitido && ["GENERADOR", "TRANSPORTISTA"].includes(req.externalRole) ? next() : res.status(403).json({ message: "No tienes permiso para esta operación." });
    if (!req.user?._id || req.user.state !== "ACTIVO") return res.status(403).json({ message: "Se requiere un empleado activo identificado." });
    const ok = (req.user.modules || []).some((m) => m.submodule?.name?.toUpperCase() === "MANIFIESTOS" && (m.submodule.permissions || []).includes(operacion));
    if (!ok) return res.status(403).json({ message: `Se requiere el permiso ${operacion} de MANIFIESTOS.` });
    next();
};
const crear = async (req, res, next) => {
    if (!req.externalUser) return next();
    try {
        const transportistaId = req.body.transportistaId;
        const generadorId = req.body.generadorId;
        if (req.externalRole === "TRANSPORTISTA" && String(transportistaId) !== String(req.externalUser.transportistaId)) return res.status(403).json({ message: "Solo puedes crear manifiestos para tu empresa." });
        if (req.externalRole === "GENERADOR" && String(generadorId) !== String(req.externalUser.generadorId)) return res.status(403).json({ message: "Solo puedes crear manifiestos para tu empresa generadora." });
        if (!await Vinculacion.exists({ generadorId, transportistaId, status: "ACEPTADA", fechaDesvinculacion: null })) return res.status(403).json({ message: "Se requiere una vinculación activa entre el generador y el transportista." });
        next();
    } catch (_) { return res.status(400).json({ message: "No se pudo validar la vinculación." }); }
};
const editar = async (req, res, next) => {
    if (!req.externalUser) return next();
    try {
        const doc = await Manifiesto.findById(req.params.manifiestoId).select("generadorId transportistaId").lean();
        if (!doc) return res.status(404).json({ message: "Manifiesto no encontrado." });
        const transportistaId = req.body.transportistaId || doc.transportistaId;
        const generadorId = req.body.generadorId || doc.generadorId;
        if (req.externalRole === "TRANSPORTISTA" && String(doc.transportistaId) !== String(req.externalUser.transportistaId)) return res.status(403).json({ message: "Solo el transportista propietario puede editar el manifiesto." });
        if (req.externalRole === "TRANSPORTISTA" && req.body.transportistaId && String(req.body.transportistaId) !== String(req.externalUser.transportistaId)) return res.status(403).json({ message: "No puedes cambiar el transportista del manifiesto." });
        if (req.externalRole === "GENERADOR" && String(doc.generadorId) !== String(req.externalUser.generadorId)) return res.status(403).json({ message: "Solo el generador propietario puede editar el manifiesto." });
        if (!await Vinculacion.exists({ generadorId, transportistaId, status: "ACEPTADA", fechaDesvinculacion: null })) return res.status(403).json({ message: "Se requiere una vinculación activa entre el generador y el transportista." });
        const borrar = (campos) => campos.forEach((campo) => delete req.body[campo]);
        borrar(["destinoId", "destinoFinal", "referendoRecepcion", "otrosManejos", "otrasObligaciones", "aprobadoPor", "rechazadoPor", "observadoPor", "subsanadoPor", "modificadoPor"]);
        if (req.externalRole === "GENERADOR") {
            borrar(["transportistaId", "transporte"]);
            if (req.body.referendoEntrega) delete req.body.referendoEntrega.responsableEors;
        } else {
            borrar(["generadorId", "responsableGestion", "planta", "residuo", "peligrosidad"]);
            if (req.body.referendoEntrega) delete req.body.referendoEntrega.generadorResponsableManejo;
        }
        next();
    } catch (_) { return res.status(400).json({ message: "No se pudo validar el manifiesto." }); }
};
module.exports = { permiso, crear, editar };
