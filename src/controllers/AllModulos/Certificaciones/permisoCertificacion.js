const accesoConsultaManifiesto = require("./ManifesTower/accesoConsultaManifiesto");

const autenticarEmpleado = (req, res, next) => {
    accesoConsultaManifiesto.autenticar(req, res, () => {
        if (req.externalUser) return res.status(403).json({ message: "Esta operación está reservada para personal interno." });
        if (!req.user?._id || req.user.state !== "ACTIVO") return res.status(403).json({ message: "Se requiere un empleado activo identificado." });
        next();
    });
};

const permiso = (submodulo, operacion = "ELIMINAR") => (req, res, next) => {
    const autorizado = (req.user?.modules || []).some((modulo) =>
        modulo.submodule?.name?.toUpperCase() === submodulo &&
        (modulo.submodule.permissions || []).includes(operacion)
    );
    if (!autorizado) return res.status(403).json({ message: `Se requiere el permiso ${operacion} de ${submodulo}.` });
    next();
};

module.exports = { autenticarEmpleado, permiso };
