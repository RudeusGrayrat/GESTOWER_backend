const mongoose = require("mongoose");
const { Schema } = mongoose;

const ubicacionSchema = new Schema(
  {
    zonaId: {
      type: Schema.Types.ObjectId,
      ref: "Zona",
      required: true,
    },

    bienes: [
      {
        stockId: {
          type: Schema.Types.ObjectId,
          required: true,
          ref: "Stock",
        },
        descripcion: {
          type: String,
          required: true,
        },
        cantidadIngresada: {
          type: Number,
          required: true,
        },

        _id: false,
      },
    ],

    rack: String,
    nivel: Number,
    seccion: Number,

    porcentaje: {
      type: Number,
      default: 0,
    },

    observaciones: String,

    estado: {
      type: String,
      enum: [
        "OCUPADO",
        "LIBRE",
        "RESERVADO",
        "MANTENIMIENTO",
        "PARCIALMENTE OCUPADO",
        "PENDIENTE",
      ],
      default: "LIBRE",
    },

    actualizadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },

    creadoPor: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ubicacion", ubicacionSchema);