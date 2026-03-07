const mongoose = require("mongoose");
const { Schema } = mongoose;

const horasExtrasSchema = new Schema(
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
        horas: {
            type: Number,
        },
        minutos: {
            type: Number,
        },
        minutosTotales: {
            type: Number,
            required: true,
        },
        motivo: {
            type: String,
        },
        //no se si asistenciaId debería estar o si es relevante
        asistenciaId: {
            type: Schema.Types.ObjectId,
            ref: "AsistenciaColaborador"
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

    },
    { timestamps: true }
);

module.exports = mongoose.model("HorasExtras", horasExtrasSchema);