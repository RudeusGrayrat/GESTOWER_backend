const mongoose = require("mongoose");

// Una solicitud no es todavía una empresa autorizada ni una cuenta activa.
// Los secretos de invitación y la contraseña propuesta nunca se devuelven por defecto.
const solicitudGeneradorSchema = new mongoose.Schema({
    ruc: { type: String, required: true, unique: true, match: /^\d{11}$/ },
    razonSocial: { type: String, required: true, trim: true },
    correoElectronico: { type: String, required: true, trim: true },
    telefono: { type: String, required: true, trim: true },
    transportistaId: { type: mongoose.Schema.Types.ObjectId, ref: "Transportista", required: true },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "UserExternal", required: true },
    estado: { type: String, enum: ["PENDIENTE_DATOS", "PENDIENTE_VERIFICACION", "APROBADA", "RECHAZADA"], default: "PENDIENTE_DATOS" },
    invitacionHash: { type: String, select: false },
    invitacionExpira: { type: Date },
    datosCompletados: { type: mongoose.Schema.Types.Mixed, select: false },
    passwordHash: { type: String, select: false },
    codigoVerificacionHash: { type: String, select: false },
    recuperacionIntentos: { type: Number, select: false },
    recuperacionLimiteHasta: { type: Date, select: false },
    fechaRecuperacionCodigo: Date,
    recuperacionesCodigo: { type: Number, default: 0 },
    generadorId: { type: mongoose.Schema.Types.ObjectId, ref: "Generador" },
    verificadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    fechaVerificacion: Date,
    consentimientoVinculacion: { fecha: Date, version: String, origen: String },
    observacion: { type: String, default: "" },
}, { timestamps: true });

module.exports = mongoose.model("SolicitudGenerador", solicitudGeneradorSchema);
