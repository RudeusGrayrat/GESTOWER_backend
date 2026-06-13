const { Router } = require("express");
const loginExternal = require("../../controllers/AllModulos/Certificaciones/ManifesTower/loginExternal");
const ManifestVerifyToken = require("../../controllers/AllModulos/Certificaciones/ManifesTower/authVerify");

const manifesTower = Router();

manifesTower.post("/login", loginExternal)

manifesTower.get("/authverify", ManifestVerifyToken);

module.exports = manifesTower;
