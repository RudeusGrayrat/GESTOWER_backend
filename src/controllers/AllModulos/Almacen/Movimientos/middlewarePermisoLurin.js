const tienePermisoLurin = (...permisosPermitidos) => (req, res, next) => {
  if (req.user?.role === "superadmin") return next();
  const permisos = req.user?.modules
    ?.filter((modulo) => String(modulo.submodule?.name || "").toUpperCase() === "LURIN")
    .flatMap((modulo) => modulo.submodule?.permissions || []) || [];
  const autorizada = permisos.some((permiso) => permisosPermitidos.includes(String(permiso).toUpperCase()));
  if (!autorizada) return res.status(403).json({ message: `Requiere el permiso: ${permisosPermitidos.join(" o ")}`, type: "Error" });
  next();
};

module.exports = tienePermisoLurin;
