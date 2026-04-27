const mongoose = require("mongoose");
const { Schema } = mongoose;
const descripcionBienesSchema = new Schema(
  {
    item: { type: Number, required: true },

    descripcion: { type: String, required: true },
    unidadDeMedida: { type: String, required: true },

    cantidadIngresada: { type: Number },
    cantidadDisponible: { type: Number },

    pesoNeto: String,
    pesoBruto: String,

    estadoEnvase: String,
    observaciones: String,

    subItem: {
      type: String,
      enum: ["1.1", "1.2", "1.3"],
    },

    // estado: {
    //   type: String,
    //   enum: ["EN_CUSTODIA", "PARCIAL", "RETIRADO"],
    //   default: "EN_CUSTODIA",
    // },
  },
  { _id: true }
);

const movimientoSchema = new Schema(
  {
    movimiento: {
      type: String,
      enum: ["INGRESO", "SALIDA"],
      required: true,
    },
    correlativa: { type: String, required: true, unique: true },
    codigoIngreso: String,
    numeroDeActa: { type: String, required: true },
    contribuyente: { type: String, required: true },
    numeroDocumento: { type: Number, required: true },
    datosGenerales: {
      fecha: { type: String, required: true },
      horaIngreso: { type: String, required: true },
      recepcionadoPor: { type: String, required: true },
      dniRecepcionadoPor: { type: String, required: true },
      responsableEntrega: { type: String, required: true },
      registroOCIP: { type: String, required: true },
      estadoActa: String,
    },
    descripcionBienes: [descripcionBienesSchema],
    detallesDePeso: String,
    referenciaImagen: {
      type: String,
    },
    observaciones: String,
    horaSalida: String,
    fechaSalida: String,
    contratoId: {
      type: Schema.Types.ObjectId,
      ref: "Contrato",
      required: true,
    },
    sedeId: {
      type: Schema.Types.ObjectId,
      ref: "Sede",
      required: true,
    },
    creadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    actualizadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    anuladoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    estado: {
      type: String,
      enum: ["ACTIVO", "ANULADO", "PENDIENTE"],
      default: "PENDIENTE",
    },
  },
  { timestamps: true }
);
const Movimiento = mongoose.model("Movimiento", movimientoSchema);
module.exports = Movimiento;
