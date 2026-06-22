const Notification = require("../../../models/Herramientas/Notification/Notificacion");

class NotificationService {
  /**
   * Crea la notificación en BD y la transmite de inmediato por Sockets
   * @param {Object} io - Instancia de Socket.IO (req.app.get("io"))
   */
  static async send(io, { type, title, message, creator, scope, entity = null }) {
    try {
      // 1. Construir payload base para el nuevo modelo
      const notificationData = {
        title,
        message,
        type,
        creatorModel: creator.model, // "Employee", "UserExternal" o "System"
        creator: creator.id,
      };

      if (entity) {
        notificationData.targetEntity = { entityId: entity.id, entityModel: entity.model };
      }

      // 2. Aplicar reglas según el tipo de alcance
      if (type === "INDIVIDUAL") {
        notificationData.receiverModel = scope.receiverModel; // "Employee" o "UserExternal"
        notificationData.receiver = scope.receiverId;
      } else if (type === "SUBMODULE") {
        notificationData.submodule = {
          name: scope.submoduleName.toUpperCase(),
          module: scope.moduleName.toUpperCase()
        };
      }

      // 3. Guardar de forma segura en MongoDB (Se disparan tus validaciones preventivas)
      const savedNotification = await new Notification(notificationData).save();

      // 4. EMISIÓN EN TIEMPO REAL ULTRA-EFICIENTE POR SALAS
      if (type === "GLOBAL") {
        // Le llega a todo el ERP interno
        io.to("ERP_GLOBAL").emit("nuevaNotificacion", savedNotification);
      }
      else if (type === "SUBMODULE") {
        // Le llega SOLO a la sala del submódulo (Ej: SUBMODULE_BOLETAS) sin tocar la BD
        const roomName = `SUBMODULE_${scope.submoduleName.toUpperCase()}`;
        io.to(roomName).emit("nuevaNotificacion", savedNotification);
        //COMPROBAR QUE ES LOQ UE SE MANDA:
        console.log(`Notificación enviada a la sala ${roomName}:`, savedNotification);
      }
      else if (type === "ROLE") {
        const roomName = `ROLE_${scope.roleName.toUpperCase()}`; // Ej: ROLE_TRANSPORTISTA
        io.to(roomName).emit("nuevaNotificacion", savedNotification);
      }
      else if (type === "INDIVIDUAL") {
        io.to(scope.receiverId.toString()).emit("nuevaNotificacion", savedNotification);
      }

      return savedNotification;
    } catch (error) {
      console.error("❌ Error en NotificationService:", error.message);
      throw error;
    }
  }
}

module.exports = NotificationService;