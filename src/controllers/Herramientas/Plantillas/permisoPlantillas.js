// La interfaz también comprueba estos permisos; aquí se protegen las escrituras en la API.
const permisoPlantillas = (accion) => (req, res, next) => {
  if (req.user?.role === "superadmin") return next();
  if (!req.user?._id || req.user.state !== "ACTIVO") {
    return res.status(403).json({ message: "Se requiere un empleado activo." });
  }
  const autorizado = (req.user.modules || []).some(({ submodule }) =>
    ["PLANTILLAS", "PLANTILLAS CONTRATO"].includes(String(submodule?.name || "").toUpperCase()) &&
    (submodule?.permissions || []).some((permiso) => String(permiso).toUpperCase() === accion)
  );
  if (!autorizado) return res.status(403).json({ message: `Se requiere el permiso ${accion} de PLANTILLAS.` });
  return next();
};

module.exports = permisoPlantillas;
