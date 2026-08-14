const { Router } = require("express");
const loginExternal = require("../../controllers/AllModulos/Certificaciones/ManifesTower/loginExternal");
const ManifestVerifyToken = require("../../controllers/AllModulos/Certificaciones/ManifesTower/authVerify");
const getSolicitudesVinculacion = require("../../controllers/AllModulos/Certificaciones/ManifesTower/getSolicitudesVinculación");
const patchVinculacion = require("../../controllers/AllModulos/Certificaciones/ManifesTower/patchVinculacion");
const postVinvulacion = require("../../controllers/AllModulos/Certificaciones/ManifesTower/postVinculacion");
const desvinculation = require("../../controllers/AllModulos/Certificaciones/ManifesTower/desvinculation");
const enviarManifiesto = require("../../controllers/AllModulos/Certificaciones/ManifesTower/envioManifiesto");
const aprobarManifiestoGenerador = require("../../controllers/AllModulos/Certificaciones/ManifesTower/approveFirma");
const dashboardStats = require("../../controllers/AllModulos/Certificaciones/ManifesTower/dashboard");
const patchUserExternal = require("../../controllers/AllModulos/Certificaciones/ManifesTower/patchUser");

const manifesTower = Router();

manifesTower.post("/login", loginExternal)

manifesTower.get("/authVerify", ManifestVerifyToken);
manifesTower.get("/getSolicitudesVinculacion", getSolicitudesVinculacion);
manifesTower.get("/dashboardStats", dashboardStats);

manifesTower.patch("/patchVinculacion/:id", patchVinculacion);
manifesTower.patch("/desvinculacion", desvinculation);
manifesTower.patch("/aprobarManifiestoGenerador/:id", aprobarManifiestoGenerador);
manifesTower.patch("/patchUserExternal", patchUserExternal)

manifesTower.post("/postVinculacion", postVinvulacion)
manifesTower.post("/enviarManifiesto/:id", enviarManifiesto)

module.exports = manifesTower;
