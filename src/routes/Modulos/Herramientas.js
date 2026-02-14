const { Router } = require("express");

const getSubmodulosPagination = require("../../controllers/AllModulos/Herramientas/ModulosYSubmodulos/getSubmodulosPagination");

const herramientasRouter = Router();

herramientasRouter.get("/getSubmodulesPagination", getSubmodulosPagination);

module.exports = herramientasRouter;
