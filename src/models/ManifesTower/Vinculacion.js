const mongoose = require('mongoose');

const vinculacionSchema = new mongoose.Schema({
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
        enum: ['PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'],
        default: 'PENDIENTE'
    },
    fechaRespuesta: {
        type: Date
    },
    respondidoPor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserExternal' // Usuario que aceptó o rechazó
    }
}, { timestamps: true });

vinculacionSchema.index({ generadorId: 1, transportistaId: 1 }, { unique: false });

const Vinculacion = mongoose.model('Vinculacion', vinculacionSchema);
module.exports = Vinculacion;