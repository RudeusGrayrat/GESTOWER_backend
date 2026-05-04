const mongoose = require("mongoose");
const { Schema } = mongoose;

const stockSchema = new Schema(
  {
    movimientoId: {
      type: Schema.Types.ObjectId,
      ref: "Movimiento",
      required: true,
    },

    bienId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    descripcion: {
      type: String,
      required: true,
    },

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
          cantidadIngresada: Number,
          cantidadDisponible: Number,
          ubicacion: String,
          actualizadoPor: { type: Schema.Types.ObjectId, ref: "Employee" },
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
      required: true,
    },

    contratoId: {
      type: Schema.Types.ObjectId,
      ref: "Contrato",
      required: true,
    },

    creadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },

    actualizadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Stock", stockSchema);