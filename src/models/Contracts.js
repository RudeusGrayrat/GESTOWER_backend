const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema(
  {
    typeContract: {
      type: String,
      required: true,
    },
    state: {
      enum: ["APROBADO", "PENDIENTE"],
      default: "PENDIENTE",
      type: String,
      required: true,
    },
    dateStart: {
      type: String,
      required: true,
    },
    dateEnd: {
      type: String,
    },
    cargo: {
      type: String,
      required: true,
    },
    sueldo: {
      type: Number,
    },
    colaborador: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    // regimenPension: {
    //   type: String,
    // },
    // codigoSpp: {
    //   type: Number,
    // },
  },
  { timestamps: true }
);

const Contract = mongoose.model("Contract", contractSchema);

module.exports = Contract;
