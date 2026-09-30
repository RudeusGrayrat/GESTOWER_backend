const mongoose = require("mongoose");
const { Schema } = require("mongoose");

const plantillasRHSchema = new Schema(
  {
    nombre: {
      type: String,
      required: true,
    },
    tipo: {
      type: String,
      enum: ["CONTRATO", "BOLETA"],
      required: true,
    },
    // Solo aplica a plantillas de contrato; la boleta usa una plantilla global.
    tipoContrato: {
      type: String,
    },
    state: {
      type: String,
      enum: ["ACTIVO", "INACTIVO"],
      default: "ACTIVO",
      required: true,
    },
    archivo: {
      type: String,
      required: true,
    },
    archivoNombre: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const PlantillasRH = mongoose.model("PlantillasRH", plantillasRHSchema);

module.exports = PlantillasRH;
