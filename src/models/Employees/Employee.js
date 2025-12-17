const mongoose = require("mongoose");
const locationSchema = require("./LocationSchema");

const employeeSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    documentType: {
      type: String,
      required: true,
    },
    documentNumber: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["VISITANTE", "COLABORADOR"],
      default: "COLABORADOR",
    },
    state: {
      type: String,
      required: true,
      enum: ["ACTIVO", "INACTIVO"],
      default: "ACTIVO",
    },
    dateOfBirth: {
      type: String,
      required: true,
    },
    dateStart: {
      type: String,
    },
    genre: {
      type: String,
      required: true,
    },
    civilStatus: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
    },
    telephone: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    location: locationSchema,
    charge: {
      type: String,
      required: true,
    },
    funcion: {
      type: String,
    },
    sueldo: {
      type: Number,
      required: true,
    },
    regimenPension: {
      type: String,
    },
    codigoSpp: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    photo: {
      type: String,
    },
    business: {
      type: String,
      ref: "Business",
      required: true,
    },
    sede: {
      type: String,
      required: true,
    },
    asistenciaAutomatica: {
      type: String,
      enum: ["SI", "NO"],
      default: "NO",
    },
    modules: [
      {
        name: {
          type: String,
          ref: "Module",
        },
        submodule: {
          name: {
            type: String,
            ref: "Submodule",
          },
          permissions: [
            {
              type: String,
              ref: "Permission",
            },
          ],
        },
      },
    ],
  },
  { timestamps: true }
);

const Employee = mongoose.model("Employee", employeeSchema);
module.exports = Employee;
