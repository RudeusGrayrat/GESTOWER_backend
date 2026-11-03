const bcrypt = require("bcrypt");
const Generador = require("../../../../models/AllModulos/Certificacion/Generadores");
const Transportista = require("../../../../models/AllModulos/Certificacion/Transportistas");
const UserExternal = require("../../../../models/ManifesTower/UserExternal");
const config = (tipo) => tipo === "GENERADOR" ? { Modelo: Generador, campo: "generadorId", submodulo: "GENERADORES" } : tipo === "TRANSPORTISTA" ? { Modelo: Transportista, campo: "transportistaId", submodulo: "TRANSPORTISTAS" } : null;
const permiso = (req, res, next) => {
  const tipo = String(req.params.tipo || "").toUpperCase(), acceso = config(tipo);
  const ok = acceso && req.user?._id && (req.user.modules || []).some((m) => m.submodule?.name?.toUpperCase() === acceso.submodulo && ["EDITAR", "APROBAR"].some((p) => (m.submodule.permissions || []).includes(p)));
  if (!ok) return res.status(403).json({ message: "No tienes permiso para administrar este acceso." });
  req.acceso = acceso; req.tipoAcceso = tipo; next();
};
const obtener = async (req, res) => {
  try {
    const empresa = await req.acceso.Model.findById(req.params.id).select("razonSocial ruc estado usuarioManifestower").lean();
    if (!empresa) return res.status(404).json({ message: "Empresa no encontrada." });
    const cuenta = await UserExternal.findOne({ [req.acceso.campo]: empresa._id, roles: req.tipoAcceso }).select("estado").lean();
    return res.json({ data: { estadoComercial: empresa.estado || "ACTIVO", acceso: cuenta?.estado === "ACTIVO" ? "ACTIVO" : cuenta ? "DESACTIVADO" : "SIN_CUENTA" } });
  } catch (_) { return res.status(500).json({ message: "No se pudo consultar el acceso." }); }
};
const actualizar = async (req, res) => {
  try {
    const accion = String(req.body?.accion || "").toUpperCase();
    if (!["ACTIVAR", "DESACTIVAR", "RESTABLECER_RUC"].includes(accion)) return res.status(400).json({ message: "Acción no válida." });
    const empresa = await req.acceso.Model.findById(req.params.id);
    if (!empresa) return res.status(404).json({ message: "Empresa no encontrada." });
    if (accion === "ACTIVAR" && empresa.estado && empresa.estado !== "ACTIVO") return res.status(409).json({ message: "Primero activa comercialmente la empresa. El acceso no reactiva empresas suspendidas." });
    let cuenta = await UserExternal.findOne({ [req.acceso.campo]: empresa._id });
    if (accion === "ACTIVAR") {
      if (!cuenta) cuenta = new UserExternal({ ruc: empresa.ruc, password: await bcrypt.hash(String(empresa.ruc), 12), roles: [req.tipoAcceso], [req.acceso.campo]: empresa._id, estado: "ACTIVO" });
      else { if (!cuenta.roles.includes(req.tipoAcceso)) cuenta.roles.push(req.tipoAcceso); cuenta[req.acceso.campo] = empresa._id; cuenta.estado = "ACTIVO"; }
      empresa.usuarioManifestower = true; await Promise.all([cuenta.save(), empresa.save()]);
      return res.json({ message: "Acceso activado. La contraseña inicial es el RUC y deberá cambiarse desde el perfil." });
    }
    if (!cuenta || !cuenta.roles.includes(req.tipoAcceso)) return res.status(404).json({ message: "La empresa no tiene acceso de ManifesTower." });
    if (accion === "DESACTIVAR") { cuenta.roles = cuenta.roles.filter((rol) => rol !== req.tipoAcceso); if (!cuenta.roles.length) cuenta.estado = "INACTIVO"; empresa.usuarioManifestower = false; await Promise.all([cuenta.save(), empresa.save()]); return res.json({ message: "Acceso desactivado. La empresa y sus manifiestos internos continúan activos." }); }
    cuenta.password = await bcrypt.hash(String(empresa.ruc), 12); await cuenta.save();
    return res.json({ message: "Contraseña restablecida al RUC. Comunícala por un canal seguro." });
  } catch (error) { console.error("Error de acceso ManifesTower:", error); return res.status(500).json({ message: "No se pudo actualizar el acceso." }); }
};
module.exports = { permiso, obtener, actualizar };
