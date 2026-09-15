const mongoose = require("mongoose");
const locationSchema = require("./LocationSchema");

const tipoTrabajadorOptions = [
  "Ejecutivo",
  "Obrero",
  "Empleado",
  "Trabajador Portuario",
  "Practicante Senati",
  "Pensionista O Cesante",
  "Pensionista - Ley 28320",
  "Construcción Civil",
  "Piloto Y Copiloto De Avia. Com.",
  "Marítimo, Fluvial O Lacustre",
  "Periodista",
  "Trab. De La Industria De Cuero",
  "Minero De Mina De Socavón",
  "Pescador - Ley 28320",
  "Minero De Tajo Abierto",
  "Minero De Industria Minera Metalúrgica",
  "Artista - Ley Del Artista - Ley 28131",
  "Agrario Dependiente - Ley 27360",
  "Trabajador Actividad Acuícola . Ley 27460",
  "Pescador Y Procesador Artesanal Independiente",
  "Reg. Especial D. Leg.1057",
  "Trabajador De La Microempresa Afiliado Al Sis",
  "Conductor De La Microempresa Afiliado Al Sis",
  "Conductor De La Microempresa - Seguro Regular",
  "Funcionario Público",
  "Empleado De Confianza",
  "Servidor Público - Directivo  Superior",
  "Servidor Público - Ejecutivo",
  "Servidor Público - Especialista",
  "Servidor Público - De Apoyo",
  "Personal De La Administración Pública - Asignación Especial - D.U. 126-2001",
  "Persona Que Genera Ingresos De Cuarta - Quinta Categoría",
];

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
    tipoTrabajador: {
      type: String,
      enum: tipoTrabajadorOptions,
      default: "Empleado",
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
    area: {
      type: String,
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
    situacionEspecial: {
      type: String,
      enum: [
        "NINGUNA",
        "TRABAJADOR DE DIRECCIÓN - PRESENCIAL",
        "TRABAJADOR DE CONFIANZA - PRESENCIAL",
        "TRABAJADOR DE DIRECCIÓN - TELETRABAJO MIXTO",
        "TRABAJADOR DE CONFIANZA - TELETRABAJO MIXTO",
        "TRABAJADOR DE DIRECCIÓN - TELETRABAJO COMPLETO",
        "TRABAJADOR DE CONFIANZA - TELETRABAJO COMPLETO",
        "TELETRABAJO MIXTO",
        "TELETRABAJO COMPLETO"
      ],
      default: "NINGUNA",
      required: true,
    },
    tipoSuspensionLaboral: {
      type: String,
      enum: ["NINGUNA", "S.P.", "S.I."],
      default: "NINGUNA",
    },
    motivoSuspensionLaboral: {
      type: String,
      default: "NINGUNA",
    },
    diasSuspensionLaboral: {
      type: String,
      default: "0",
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
