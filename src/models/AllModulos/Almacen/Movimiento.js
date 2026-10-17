const mongoose = require("mongoose");
const { Schema } = mongoose;
const descripcionBienesSchema = new Schema(
  {
    item: { type: Number, required: true },

    descripcion: { type: String, required: true },
    unidadDeMedida: { type: String, required: true },

    cantidadIngresada: { type: Number },
    cantidadDisponible: { type: Number },
    stockFinal: { type: Number },

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
      enum: ["INGRESO", "SALIDA", "MERGE"],
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
    detallePeso: {
      texto: { type: String, default: "" },
      filas: [{
        concepto: { type: String, default: "" },
        pesoNeto: { type: Number },
        pesoBruto: { type: Number },
        observacion: { type: String, default: "" },
      }],
    },
    referenciaImagen: [{
      type: String,
    }],
    observaciones: String,
    detalleObservaciones: {
      texto: { type: String, default: "" },
      filas: [{
        asunto: { type: String, default: "" },
        descripcion: { type: String, default: "" },
      }],
    },
    actasEscaneadas: [{
      nombre: { type: String, required: true },
      mimeType: { type: String, required: true },
      url: { type: String, required: true },
      subidoPor: { type: Schema.Types.ObjectId, ref: "Employee" },
      fecha: { type: Date, default: Date.now },
    }],
    comentarios: [{
      texto: { type: String, required: true },
      creadoPor: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
      fecha: { type: Date, default: Date.now },
    }],
    historialCambiosPeso: [{
      bienId: { type: Schema.Types.ObjectId, required: true },
      pesoNetoAnterior: Number,
      pesoNetoNuevo: Number,
      pesoBrutoAnterior: Number,
      pesoBrutoNuevo: Number,
      justificacion: { type: String, required: true },
      corregidoPor: { type: Schema.Types.ObjectId, ref: "Employee", required: true },
      fecha: { type: Date, default: Date.now },
    }],
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
      // required: true,
    },
    actualizadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    aprobadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    rechazadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    estado: {
      type: String,
      enum: ["APROBADO", "RECHAZADO", "PENDIENTE"],
      default: "PENDIENTE",
    },
  },
  { timestamps: true }
);
const Movimiento = mongoose.model("Movimiento", movimientoSchema);
module.exports = Movimiento;
