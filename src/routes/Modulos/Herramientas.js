const { Router } = require("express");

const getSubmodulosPagination = require("../../controllers/AllModulos/Herramientas/ModulosYSubmodulos/getSubmodulosPagination");
const getMyNotifications = require("../../controllers/Herramientas/Notification/getNotification");
const NotificacionLeida = require("../../controllers/Herramientas/Notification/marcarLeida");

const herramientasRouter = Router();

herramientasRouter.get("/getSubmodulesPagination", getSubmodulosPagination);
herramientasRouter.get("/getNotificaciones", getMyNotifications);
herramientasRouter.patch("/notificacionLeida/:id", NotificacionLeida);

module.exports = herramientasRouter;
