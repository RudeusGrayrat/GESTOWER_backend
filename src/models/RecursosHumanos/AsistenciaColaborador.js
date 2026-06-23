const mongoose = require("mongoose");
const { Schema } = mongoose;

const asistenciaColaboradorSchema = new Schema(
  {
    colaborador: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    fecha: {
      type: String,
      required: true,
    },
    ingreso: {
      type: String,
      // required: true,
    },
    ingresoSede: {
      type: String,
    },
    salida: {
      type: String,
    },
    salidaSede: {
      type: String,
    },
    inicioAlmuerzo: {
      type: String,
    },
    almuerzoSede: {
      type: String,
    },
    finAlmuerzo: {
      type: String,
    },
    finAlmuerzoSede: {
      type: String,
    },
    minTarde: {
      type: Number,
      default: 0,
    },
    minExtras: {
      type: Number,
      default: 0,
    },
    observaciones: {
      type: String,
    },
    estado: {
      type: String,
      enum: ["PRESENTE", "FALTA", "TARDANZA", "PERMISO", "VACACIONES"],
      default: "FALTA",
    },
  },
  { timestamps: true }
);

const AsistenciaColaborador = mongoose.model(
  "AsistenciaColaborador",
  asistenciaColaboradorSchema
);

module.exports = AsistenciaColaborador;
