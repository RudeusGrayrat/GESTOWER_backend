const mongoose = require("mongoose");
const { Schema } = mongoose;

const permisoSchema = new Schema(
    {
        colaborador: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },

        fechaInicio: {
            type: String,
            required: true,
        },

        fechaFin: {
            type: String,
            required: true,
        },
        duracionHoras: {
            type: Number,
        },

        tipo: {
            type: String,
            required: true,
        },

        motivo: {
            type: String,
        },

        conGoce: {
            type: Boolean,
            default: false,
        },

        estado: {
            type: String,
            enum: ["PENDIENTE", "APROBADO", "RECHAZADO"],
            default: "PENDIENTE",
        },
        creadoPor: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        aprobadoPor: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
        },
        historial: [
            {
                usuario: {
                    type: Schema.Types.ObjectId,
                    ref: "Employee",
                },
                accion: {
                    type: String,
                },
                fecha: {
                    type: Date,
                    default: Date.now,
                }
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Permiso", permisoSchema);