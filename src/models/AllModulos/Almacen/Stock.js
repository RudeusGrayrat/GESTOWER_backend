const mongoose = require("mongoose");
const { Schema } = mongoose;

const stockSchema = new Schema(
  {
    movimientoId: {
      type: Schema.Types.ObjectId,
      ref: "Movimiento",

    },
    descripcion: {
      type: String,
      required: true,
    },
    codigoIngreso: { type: String, required: false },
    numeroDeActa: { type: String, required: false },
    fechaIngreso: { type: String, required: false },
    bienId: {
      type: Schema.Types.ObjectId,

    },
    item: Number,
    pesoNeto: String,
    pesoBruto: String,
    unidadDeMedida: String,


    cantidadTotal: {
      type: Number,
      required: true,
    },

    cantidadDisponible: {
      type: Number,
      required: true,
    },
    historial: {
      type: [
        {
          fecha: { type: Date, default: Date.now },
          accion: String,
          cantidadIngresada: Number,
          cantidadDisponible: Number,
          cantidadTotal: Number,
          ubicacion: String,
          actualizadoPor: { type: Schema.Types.ObjectId, ref: "Employee" },
          correlativa: String,
        },
      ],
      default: [],
    },
    estado: {
      type: String,
      enum: ["ACTIVO", "PARCIAL", "AGOTADO"],
      default: "ACTIVO",
    },

    sedeId: {
      type: Schema.Types.ObjectId,
      ref: "Sede",

    },

    contratoId: {
      type: Schema.Types.ObjectId,
      ref: "Contrato",

    },

    creadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },

    actualizadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
    ubicado: { type: Boolean, default: false },
    ubicaciones: [
      {
        type: Schema.Types.ObjectId,
        ref: "Ubicacion",
      },
    ]
  },
  { timestamps: true }
);
stockSchema.index({ contratoId: 1 });
stockSchema.index({ ubicado: 1 });
stockSchema.index({ bienId: 1 });
module.exports = mongoose.model("Stock", stockSchema);