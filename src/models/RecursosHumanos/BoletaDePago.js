const mongoose = require("mongoose");

const boletaDePagosSchema = mongoose.Schema(
  {
    correlativa: {
      type: Number,
      required: true,
      unique: true,
    },
    fechaBoletaDePago: {
      type: String,
      required: true,
    },
    colaborador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    empresaColaborador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
    },
    situacionEspecial: {
      type: String,
    },
    fechaIngresoColaborador: {
      type: String,
    },
    envio: {
      type: String,
    },
    recepcion: {
      type: String,
    },
    state: {
      enum: ["APROBADO", "PENDIENTE"],
      default: "PENDIENTE",
      type: String,
      required: true,
    },
    diasTrabajados: {
      type: String,
      required: true,
    },
    diasSubsidiados: {
      type: String,
      required: true,
    },
    horasTrabajadas: {
      type: String,
      required: true,
    },
    diasNoLaborales: {
      type: String,
      required: true,
    },
    remuneraciones: [
      {
        datosContables: {
          type: String,
          ref: "DatosContables",
        },
        monto: {
          type: String,
          required: true,
          default: "0",
        },
      },
    ],
    descuentosAlTrabajador: [
      {
        datosContables: {
          type: String,
          ref: "DatosContables",
        },
        monto: {
          type: String,
          required: true,
          default: "0",
        },
      },
    ],
    aportacionesDelEmpleador: [
      {
        datosContables: {
          type: String,
          ref: "DatosContables",
        },
        monto: {
          type: String,
          required: true,
          default: "0",
        },
      },
    ],
  },
  { timestamps: true }
);

const BoletaDePagos = mongoose.model("BoletaDePagos", boletaDePagosSchema);
module.exports = BoletaDePagos;
