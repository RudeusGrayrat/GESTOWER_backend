const { Router } = require("express");
const loginExternal = require("../../controllers/AllModulos/Certificaciones/ManifesTower/loginExternal");
const ManifestVerifyToken = require("../../controllers/AllModulos/Certificaciones/ManifesTower/authVerify");
const getSolicitudesVinculacion = require("../../controllers/AllModulos/Certificaciones/ManifesTower/getSolicitudesVinculación");
const patchVinculacion = require("../../controllers/AllModulos/Certificaciones/ManifesTower/patchVinculacion");
const postVinvulacion = require("../../controllers/AllModulos/Certificaciones/ManifesTower/postVinculacion");
const desvinculation = require("../../controllers/AllModulos/Certificaciones/ManifesTower/desvinculation");

const manifesTower = Router();

manifesTower.post("/login", loginExternal)

manifesTower.get("/authVerify", ManifestVerifyToken);
manifesTower.get("/getSolicitudesVinculacion", getSolicitudesVinculacion);

manifesTower.patch("/patchVinculacion/:id", patchVinculacion);
manifesTower.patch("/desvinculacion", desvinculation);

manifesTower.post("/postVinculacion", postVinvulacion)

module.exports = manifesTower;
