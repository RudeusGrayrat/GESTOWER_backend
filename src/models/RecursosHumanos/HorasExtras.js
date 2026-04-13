const mongoose = require("mongoose");
const { Schema } = mongoose;

const horasExtrasSchema = new Schema(
    {
        solicitante: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        fecha: {
            type: String,
            required: true,
        },
        retribucion: {
            type: String,
            enum: ["PAGO", "COMPENSACION"],
            required: true,
        },
        formaCompensacion: {
            type: String,
        },
        motivo: {
            type: String,
        },
        colaboradores: [
            {
                colaborador: {
                    type: Schema.Types.ObjectId,
                    ref: "Employee",
                },
                horaInicio: {
                    type: String,
                },
                horaFin: {
                    type: String,
                },
                horas: {
                    type: Number,
                },
                minutos: {
                    type: Number,
                },
                minutosTotales: {
                    type: Number,
                },
                asistenciaId: {
                    type: Schema.Types.ObjectId,
                    ref: "AsistenciaColaborador"
                },
            }
        ],
        estado: {
            type: String,
            enum: ["PENDIENTE", "ENVIADO", "APROBADO", "RECHAZADO"],
            default: "PENDIENTE",
        },
        creadoPor: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
            required: true,
        },
        modificadoPor: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
        },
        aprobadoPor: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
        },
        rechazadoPor: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
        },
        enviadoPor: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("HorasExtras", horasExtrasSchema);