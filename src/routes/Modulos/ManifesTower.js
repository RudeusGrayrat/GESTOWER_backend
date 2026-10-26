const { Router } = require("express");
const loginExternal = require("../../controllers/AllModulos/Certificaciones/ManifesTower/loginExternal");
const ManifestVerifyToken = require("../../controllers/AllModulos/Certificaciones/ManifesTower/authVerify");
const getSolicitudesVinculacion = require("../../controllers/AllModulos/Certificaciones/ManifesTower/getSolicitudesVinculación");
const patchVinculacion = require("../../controllers/AllModulos/Certificaciones/ManifesTower/patchVinculacion");
const postVinvulacion = require("../../controllers/AllModulos/Certificaciones/ManifesTower/postVinculacion");
const desvinculation = require("../../controllers/AllModulos/Certificaciones/ManifesTower/desvinculation");
const enviarManifiesto = require("../../controllers/AllModulos/Certificaciones/ManifesTower/envioManifiesto");
const dashboardStats = require("../../controllers/AllModulos/Certificaciones/ManifesTower/dashboard");
const patchUserExternal = require("../../controllers/AllModulos/Certificaciones/ManifesTower/patchUser");
const solicitudGenerador = require("../../controllers/AllModulos/Certificaciones/ManifesTower/solicitudGenerador");
const tokenVerify = require("../../controllers/auth/midellware");
const autenticarExterno = require("../../controllers/AllModulos/Certificaciones/ManifesTower/authExterno");
const autorizarAccionManifiesto = require("../../controllers/AllModulos/Certificaciones/ManifesTower/autorizarAccionManifiesto");

const manifesTower = Router();

manifesTower.post("/login", loginExternal)

manifesTower.get("/authVerify", ManifestVerifyToken);
manifesTower.get("/getSolicitudesVinculacion", getSolicitudesVinculacion);
manifesTower.get("/dashboardStats", dashboardStats);

manifesTower.patch("/patchVinculacion/:id", patchVinculacion);
manifesTower.patch("/desvinculacion", desvinculation);
manifesTower.patch("/patchUserExternal", autenticarExterno, patchUserExternal)

manifesTower.post("/postVinculacion", solicitudGenerador.autenticarTransportista, postVinvulacion)
manifesTower.post("/enviarManifiesto/:id", autenticarExterno, autorizarAccionManifiesto("TRANSPORTISTA"), enviarManifiesto)

manifesTower.post("/solicitudes-generador", solicitudGenerador.autenticarTransportista, solicitudGenerador.crear);
manifesTower.post("/generadores/registro-directo", solicitudGenerador.autenticarTransportista, solicitudGenerador.crearDirecta);
manifesTower.get("/mis-solicitudes-generador", solicitudGenerador.autenticarTransportista, solicitudGenerador.listarPropias);
manifesTower.post("/mis-solicitudes-generador/:id/renovar", solicitudGenerador.autenticarTransportista, solicitudGenerador.renovar);
manifesTower.post("/generadores/:id/enlace-acceso", solicitudGenerador.autenticarTransportista, solicitudGenerador.generarEnlaceAcceso);
manifesTower.get("/mi-generador", solicitudGenerador.autenticarGenerador, solicitudGenerador.miGenerador);
manifesTower.post("/invitacion-generador/consultar", solicitudGenerador.consultarInvitacion);
manifesTower.post("/invitacion-generador/completar", solicitudGenerador.completar);
manifesTower.post("/enlace-acceso-generador/consultar", solicitudGenerador.consultarEnlaceAcceso);
manifesTower.post("/enlace-acceso-generador/completar", solicitudGenerador.completarEnlaceAcceso);
manifesTower.post("/invitacion-generador/recuperar-codigo", solicitudGenerador.recuperarCodigo);
manifesTower.get("/solicitudes-generador", tokenVerify, solicitudGenerador.permisoGeneradores("VER"), solicitudGenerador.listar);
manifesTower.post("/solicitudes-generador/:id/aprobar", tokenVerify, solicitudGenerador.permisoGeneradores("APROBAR"), solicitudGenerador.aprobar);
manifesTower.post("/generadores/:id/activar", tokenVerify, solicitudGenerador.permisoGeneradores("APROBAR"), solicitudGenerador.activarRegistroDirecto);
manifesTower.post("/generadores/:id/desaprobar", tokenVerify, solicitudGenerador.permisoGeneradores("DESAPROBAR"), solicitudGenerador.suspenderORechazarRegistro);

module.exports = manifesTower;
