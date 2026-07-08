const mongoose = require("mongoose");

const vinculacionSchema = mongoose.Schema(
    {
        generadorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Generador',
            required: true
        },
        transportistaId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Transportista',
            required: true
        },
        iniciadoPor: {
            type: String,
            enum: ['GENERADOR', 'TRANSPORTISTA'],
            required: true
        },
        status: {
            type: String,
            enum: ['PENDIENTE', 'ACEPTADA', 'RECHAZADA'],
            default: 'PENDIENTE'
        },
        respondidoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserExternal'
        },
        fechaRespuesta: {
            type: Date
        },
        tienePermisoLlenado: {
            type: Boolean,
            default: false
        },
        fechaDesvinculacion: {
            type: Date,
            default: null
        },
        desvinculadoPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'UserExternal',
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Vinculacion", vinculacionSchema);