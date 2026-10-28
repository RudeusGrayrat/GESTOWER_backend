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
            enum: ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'SUSPENDIDA'],
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
        pendienteActivacionTower: {
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
        , motivoDesvinculacion: { type: String, default: "", maxlength: 500 }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Vinculacion", vinculacionSchema);
