const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "El título es obligatorio."],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "El mensaje es obligatorio."],
      trim: true,
    },
    type: {
      type: String,
      enum: ["GLOBAL", "SUBMODULE", "INDIVIDUAL"],
      required: true,
    },
    submodule: {
      name: { type: String, uppercase: true },   // Ej: "MANIFIESTOS", "INVENTARIO"
      module: { type: String, uppercase: true }, // Ej: "OPERACIONES", "SISTEMAS"
    },
    roleScope: {
      roleName: { type: String, enum: ["TRANSPORTISTA", "GENERADOR"], uppercase: true }, // Ej: "TRANSPORTISTA", "GENERADOR"
    },

    /* 💡 MEJORA 1: POLIMORFISMO MULTIRROL (refPath)
      Ya no estás amarrado solo a "Employee". Ahora puedes recibir e indicar creadores 
      que sean Empleados internos o Usuarios Externos (Generadores/Transportistas).
    */
    receiverModel: {
      type: String,
      enum: ["Employee", "UserExternal"],
      required: function () { return this.type === "INDIVIDUAL"; }
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "receiverModel", // Mongoose buscará dinámicamente en la colección correcta
      required: function () { return this.type === "INDIVIDUAL"; },
    },

    creatorModel: {
      type: String,
      enum: ["Employee", "UserExternal", "System"],
      default: "System"
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "creatorModel",
    },

    /* 💡 MEJORA 2: CONTEXTO PARA EL FRONTEND (Ruteo dinámico)
      Para que cuando el usuario haga click en el Front, tu app sepa a dónde redirigir.
      Ejemplo: entityId: "ID_DE_UN_MANIFIESTO", entityModel: "Manifiesto"
    */
    targetEntity: {
      entityId: { type: mongoose.Schema.Types.ObjectId },
      entityModel: { type: String }
    },

    /* 💡 MEJORA 3: LECTURA MULTI-USUARIO PARA GLOBALES Y SUBMÓDULOS
      Si la notificación es INDIVIDUAL, usamos 'isReadIndividual'.
      Si es GLOBAL o SUBMODULE, guardamos los IDs de quienes la van abriendo en 'readBy'.
    */
    isReadIndividual: {
      type: Boolean,
      default: false,
    },
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId },
        readAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

// 💡 MEJORA 4: VALIDACIÓN PREVENTIVA
notificationSchema.path("Submodule")?.validate(function (value) {
  if (this.type === "SUBMODULE" && (!value.name || !value.module)) {
    return false;
  }
  return true;
}, "Si el tipo es SUBMODULE, debes especificar 'name' y 'module'.");

// 💡 MEJORA 5: ÍNDICES DE ALTO RENDIMIENTO
notificationSchema.index({ type: 1, receiver: 1, isReadIndividual: 1 });
notificationSchema.index({ "submodule.name": 1, createdAt: -1 });

// 🔥 NUEVO ÍNDICE TTL: Auto-eliminación a los 60 días (2 meses)
// 60 días * 24 horas * 60 minutos * 60 segundos = 5184000 segundos
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5184000 });

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;